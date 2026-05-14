const { createLlm } = require("../services/agent");

async function buildQueries(userMessage, userLanguage, vectorStore, notebookId, queryModel) {
  let roughContext = "";
  try {
    const roughDocs = await vectorStore.similaritySearchWithScore(userMessage, 4, {
      must: [{ key: "metadata.notebookId", match: { value: String(notebookId) } }],
    });
    roughContext = roughDocs.map(([doc]) => doc.pageContent.slice(0, 200)).join("\n");
  } catch (_) {
    roughContext = "";
  }

  const prompt = `
You generate search queries for a document database.

STRICT RULES:
- Use ONLY topics present in the CONTEXT
- Do NOT introduce new topics
- Write exactly 3 query
- Same language as ${userLanguage}
- One query per line
- No numbering
- No explanations
- No extra text

CONTEXT:
${roughContext || "N/A"}

USER QUESTION:
${userMessage}
`;

  let aiQueries = [];
  try {
    const queryLlm = createLlm(queryModel);
    const res = await queryLlm.invoke(prompt);
    aiQueries = res.content
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean)
      .filter((q) => q.length > 5 && q.length < 120)
      .filter((q) => !q.toLowerCase().includes("query"))
      .filter((q) => !q.toLowerCase().includes("context"))
      .slice(0, 3);
  } catch (_) {
    aiQueries = [];
  }

  if (aiQueries.length === 0) return [userMessage];

  if (roughContext) {
    aiQueries = aiQueries.filter((q) => {
      const firstWord = q.split(" ")[0].toLowerCase();
      return roughContext.toLowerCase().includes(firstWord);
    });
    if (aiQueries.length === 0) return [userMessage];
  }

  return [...new Set([userMessage, ...aiQueries])];
}

function pickLlm(model) {
  return createLlm(model);
}

function buildAnswerPrompt(query, context, history, userLanguage) {
  return `You are a professional document analysis assistant.
Answer the user's question using ONLY the provided CONTEXT.

STRICT RULES:
1. LANGUAGE: You MUST answer in ${userLanguage}. Always use ${userLanguage} regardless of the question's language.
2. FORMAT: Use plain text only. DO NOT wrap the response in code blocks, JSON, or JavaScript functions.
3. CITATIONS: Use ONLY the format [n] (e.g., [1]) at the end of sentences, NEVER write "Documento [n]" or "[Documento n]". Use ONLY the number inside brackets.
4. HONESTY: If the context doesn't have the answer, state that you don't know in ${userLanguage}.
5. NO META-TALK: Do not mention your internal processes.

USER LANGUAGE: ${userLanguage}

CONTEXT:
${context}

HISTORY:
${history}

USER QUESTION: ${query}

FINAL ANSWER:`;
}

async function generateAnswer(query, context, history, userLanguage, model) {
  const llm = pickLlm(model);
  const prompt = buildAnswerPrompt(query, context, history, userLanguage);
  const res = await llm.invoke(prompt);
  const text = res.content.trim().replace(/^```[a-z]*\n?|```$/gi, "");
  const usage = res.response_metadata?.usage || res.usage_metadata || null;
  return {
    text,
    usage: usage ? {
      totalTokens: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0) || usage.total_tokens || 0,
      promptTokens: usage.prompt_tokens || usage.input_tokens || 0,
      completionTokens: usage.completion_tokens || usage.output_tokens || 0,
    } : null,
  };
}

async function streamAnswer(query, context, history, userLanguage, model, onToken) {
  const llm = pickLlm(model);
  const prompt = buildAnswerPrompt(query, context, history, userLanguage);

  let full = "";
  let lastUsage = null;
  const stream = await llm.stream(prompt);
  for await (const chunk of stream) {
    const piece = chunk?.content || "";
    if (piece) {
      full += piece;
      if (onToken) onToken(piece);
    }
    if (chunk?.response_metadata?.usage || chunk?.usage_metadata) {
      lastUsage = chunk.response_metadata?.usage || chunk.usage_metadata;
    }
  }
  const text = full.trim().replace(/^```[a-z]*\n?|```$/gi, "");
  return {
    text,
    usage: lastUsage ? {
      totalTokens: (lastUsage.prompt_tokens || 0) + (lastUsage.completion_tokens || 0) || lastUsage.total_tokens || 0,
      promptTokens: lastUsage.prompt_tokens || lastUsage.input_tokens || 0,
      completionTokens: lastUsage.completion_tokens || lastUsage.output_tokens || 0,
    } : null,
  };
}

module.exports = {
  buildQueries,
  generateAnswer,
  streamAnswer,
};
