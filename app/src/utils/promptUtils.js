const { directChat, directChatStream } = require("../services/directChat");

function wordOverlapRatio(a, b) {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let common = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) common++;
  }
  return common / Math.min(wordsA.size, wordsB.size);
}

async function buildQueries(userMessage, userLanguage, vectorStore, notebookId, queryModel) {
  if (!queryModel) return [userMessage];

  let roughContext = "";
  try {
    const roughDocs = await vectorStore.similaritySearchWithScore(userMessage, 4, {
      must: [{ key: "metadata.notebookId", match: { value: String(notebookId) } }],
    });
    roughContext = roughDocs.map(([doc]) => doc.pageContent.slice(0, 200)).join("\n");
  } catch (_) {
    roughContext = "";
  }

  const systemPrompt = `You generate search queries for a document database.

STRICT RULES:
- Use ONLY topics present in the CONTEXT
- Do NOT introduce new topics
- Write exactly 3 queries
- You MUST write every query in ${userLanguage}. Use ${userLanguage} only.
- One query per line
- No numbering
- No explanations
- No extra text`;

  const userPrompt = `CONTEXT:
${roughContext || "N/A"}

USER QUESTION:
${userMessage}

Generate 3 search queries in ${userLanguage}.`;

  let aiQueries = [];
  try {
    const result = await directChat(queryModel, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);
    aiQueries = result.text
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
    aiQueries = aiQueries.filter((q) => wordOverlapRatio(q, roughContext) > 0.2);
    if (aiQueries.length === 0) return [userMessage];
  }

  return [...new Set([userMessage, ...aiQueries])];
}

function buildChatMessages(query, context, history, userLanguage) {
  const systemPrompt = `You are a professional document analysis assistant. Answer the user's question using ONLY the provided CONTEXT.

STRICT RULES:
1. LANGUAGE: You MUST answer in ${userLanguage}. Always use ${userLanguage} regardless of the question's language.
2. FORMAT: Use plain text only. DO NOT wrap the response in code blocks, JSON, or JavaScript functions.
3. CITATIONS: Use ONLY the format [n] (e.g., [1]) at the end of sentences. Use ONLY the number inside brackets.
4. HONESTY: If the context doesn't have the answer, state that you don't know in ${userLanguage}.
5. NO META-TALK: Do not mention your internal processes.`;

  const userContent = `CONTEXT:
${context}

HISTORY:
${history}

USER QUESTION: ${query}

REMEMBER: Write the FINAL ANSWER entirely in ${userLanguage}.

FINAL ANSWER:`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent }
  ];
}

async function generateAnswer(query, context, history, userLanguage, model) {
  const messages = buildChatMessages(query, context, history, userLanguage);
  const result = await directChat(model, messages, { num_predict: 2048 });
  return {
    text: result.text,
    usage: result.usage || null,
  };
}

async function streamAnswer(query, context, history, userLanguage, model, onToken) {
  const messages = buildChatMessages(query, context, history, userLanguage);
  const result = await directChatStream(model, messages, onToken, { num_predict: 2048 });
  return {
    text: result.text,
    usage: result.usage || null,
  };
}

module.exports = {
  buildQueries,
  generateAnswer,
  streamAnswer,
};
