const { llm: defaultLlm, llmQueryBuilder } = require("../services/agent");
const { ChatOllama } = require("@langchain/ollama");
const { franc } = require("franc");

const langMap = {
  por: "Portuguese",
  eng: "English",
  spa: "Spanish",
  fra: "French",
  deu: "German",
  ita: "Italian",
};

async function detectLanguage(text) {
  try {
    if (!text || text.length < 10) return "Portuguese";
    const langCode = franc(text);
    if (langCode === "und") return "Portuguese";
    return langMap[langCode] || "Portuguese";
  } catch (_) {
    return "Portuguese";
  }
}

async function buildQueries(userMessage, detectedLang, vectorStore, notebookId) {
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
- Same language as ${detectedLang}
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
    const res = await llmQueryBuilder.invoke(prompt);
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
  if (!model) return defaultLlm;
  return new ChatOllama({
    model,
    baseUrl: process.env.OLLAMA_URL || "http://localhost:11434",
    temperature: 0,
  });
}

function buildAnswerPrompt(query, context, history, detectedLang) {
  return `You are a professional document analysis assistant.
Answer the user's question using ONLY the provided CONTEXT.

STRICT RULES:
1. LANGUAGE: You MUST respond in ${detectedLang}.
2. FORMAT: Use plain text only. DO NOT wrap the response in code blocks, JSON, or JavaScript functions.
3. CITATIONS: Use ONLY the format [n] (e.g., [1]) at the end of sentences, NEVER write "Documento [n]" or "[Documento n]". Use ONLY the number inside brackets.
4. HONESTY: If the context doesn't have the answer, state that you don't know in ${detectedLang}.
5. NO META-TALK: Do not mention your internal processes.

CONTEXT:
${context}

HISTORY:
${history}

USER QUESTION: ${query}

FINAL ANSWER IN ${detectedLang}:`;
}

async function generateAnswer(query, context, history, detectedLang, model) {
  const llm = pickLlm(model);
  const prompt = buildAnswerPrompt(query, context, history, detectedLang);
  const res = await llm.invoke(prompt);
  return res.content.trim().replace(/^```[a-z]*\n?|```$/gi, "");
}

async function streamAnswer(query, context, history, detectedLang, model, onToken) {
  const llm = pickLlm(model);
  const prompt = buildAnswerPrompt(query, context, history, detectedLang);

  let full = "";
  const stream = await llm.stream(prompt);
  for await (const chunk of stream) {
    const piece = chunk?.content || "";
    if (piece) {
      full += piece;
      if (onToken) onToken(piece);
    }
  }
  return full.trim().replace(/^```[a-z]*\n?|```$/gi, "");
}

module.exports = {
  detectLanguage,
  buildQueries,
  generateAnswer,
  streamAnswer,
};
