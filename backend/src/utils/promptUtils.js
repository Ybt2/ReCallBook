const { llm, llmQueryBuilder } = require("../services/agent");
const { franc } = require("franc");

const langMap = {
  por: "Portuguese",
  eng: "English",
  spa: "Spanish",
  fra: "French",
  deu: "German",
  ita: "Italian"
};

async function detectLanguage(text) {
  try {
    // franc precisa de algum tamanho mínimo
    if (!text || text.length < 10) {
      return "English"; // fallback
    }

    const langCode = franc(text);

    // franc retorna 'und' se não souber
    if (langCode === "und") {
      return "English";
    }

    return langMap[langCode] || "English";
  } catch (error) {
    return "English";
  }
}

async function buildQueries(userMessage, detectedLang, vectorStore, notebookId) {
  // 🔹 1. Buscar contexto leve (grounding)
  let roughContext = "";
  try {
    const roughDocs = await vectorStore.similaritySearchWithScore(userMessage, 4, {
      must: [{ key: "metadata.notebookId", match: { value: String(notebookId) } }]
    });

    roughContext = roughDocs
      .map(([doc]) => doc.pageContent.slice(0, 200))
      .join("\n");
  } catch (e) {
    // se falhar, segue sem contexto
    roughContext = "";
  }

  // 🔹 2. Prompt restrito (anti-alucinação)
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
        .map(q => q.trim())
        .filter(Boolean)
        // remove lixo comum
        .filter(q => q.length > 5 && q.length < 120)
        .filter(q => !q.toLowerCase().includes("query"))
        .filter(q => !q.toLowerCase().includes("context"))
        .slice(0, 3);

    } catch (e) {
      aiQueries = [];
    }


  // 🔹 3. Fallback inteligente
  if (aiQueries.length === 0) {
    return [userMessage];
  }

  // 🔹 4. (Opcional) filtro leve contra drift
  if (roughContext) {
    aiQueries = aiQueries.filter(q => {
      const firstWord = q.split(" ")[0].toLowerCase();
      return roughContext.toLowerCase().includes(firstWord);
    });

    if (aiQueries.length === 0) {
      return [userMessage];
    }
  }

  // 🔹 5. Garantir unicidade + incluir original
  return [...new Set([userMessage, ...aiQueries])];
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
  generateAnswer,
};
