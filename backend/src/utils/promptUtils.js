const llm = require("../services/agent");

async function detectLanguage(text) {
  const prompt = `Identify the language of the following text. 
  Respond ONLY with the name of the language (e.g., Portuguese, English, Spanish).
  
  TEXT: ${text}`;

  try {
    const res = await llm.invoke(prompt);
    return res.content.trim();
  } catch (error) {
    return "the user's original language";
  }
}

async function buildQueries(userMessage, detectedLang) {
  const prompt = `You are a search expert. Given the message in ${detectedLang}, generate 3 search variations or keywords in the same language to retrieve relevant documents from a database.
  Respond ONLY with the queries, one per line.
  
  MESSAGE: ${userMessage}`;

  const res = await llm.invoke(prompt);
  const aiQueries = res.content
    .split('\n')
    .map(q => q.trim().replace(/^\d+\.\s*/, ""))
    .filter(Boolean);

  return [...new Set([userMessage, ...aiQueries])];
}

async function classifyAndBuildQueries(userMessage, vectorStore, notebookId, detectedLang) {
  const classifyPrompt = `Is the following question a meta-question about a document (asking to summarize, explain, or describe the general content)?
  Respond ONLY with "YES" or "NO".
  
  QUESTION: ${userMessage}`;

  const res = await llm.invoke(classifyPrompt);
  const isMeta = res.content.trim().toUpperCase().includes("YES");

  if (!isMeta) return buildQueries(userMessage, detectedLang);

  const roughResults = await vectorStore.similaritySearchWithScore(userMessage, 8, {
    must: [{ key: "metadata.notebookId", match: { value: String(notebookId) } }]
  });

  if (roughResults.length === 0) return [userMessage];

  const roughContext = roughResults
    .map(([doc]) => doc.pageContent.slice(0, 400))
    .join("\n\n");

  const hydePrompt = `Based on these excerpts, generate a single search query in ${detectedLang} that summarizes the main topics.
  Respond ONLY with the query text.
  
  EXCERPTS:
  ${roughContext}`;

  const hydeRes = await llm.invoke(hydePrompt);
  return buildQueries(hydeRes.content.trim(), detectedLang);
}

async function generateAnswer(query, context, history, detectedLang) {
  const prompt = `You are a professional document analysis assistant. 
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

  const res = await llm.invoke(prompt);
  return res.content.trim().replace(/^```[a-z]*\n?|```$/gi, "");
}

module.exports = {
  detectLanguage,
  buildQueries,
  classifyAndBuildQueries,
  generateAnswer,
};
