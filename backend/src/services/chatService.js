const { getVectorStore } = require("../db/qdrant");
const fs = require('fs');
const path = require('path');
const LOG_FILE = path.join(__dirname, '..', '..', 'logs', 'rag_timing.log');
try {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
} catch (e) {}

function log(msg) {
  fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} - ${msg}\n`);
}
const { searchDocuments } = require("../utils/searchUtils");
const { detectLanguage, buildQueries, generateAnswer } = require("../utils/promptUtils");
const { buildContext, extractSources } = require("../utils/contextUtils");
const crossEncoder = require('./cross_encoder');
const { getEncoding } = require("js-tiktoken");

const enc = getEncoding("cl100k_base");

async function chatWithAi(notebookId, userMessage, history, docIds = null) {
  try {
    const startVector = Date.now();
    const vectorStore = await getVectorStore();
    log(`Vector store ready: ${Date.now() - startVector} ms`);

    const detectedLang = await detectLanguage(userMessage);
    const queries = await buildQueries(userMessage, detectedLang, vectorStore, notebookId);
    const vectorDocs = await searchDocuments(vectorStore, queries, notebookId, docIds);
    const finalDocs = await crossEncoder.rerank(queries.join(" "), vectorDocs.slice(0, 20));

    if (finalDocs.length === 0) {
      if (vectorDocs.length > 0) finalDocs.push(...vectorDocs.slice(0, 3));
      else return { texto_final: "No relevant information found.", fontes: [], usage: { totalTokens: 0 } };
    }

    const context = buildContext(finalDocs);
    const answer = await generateAnswer(userMessage, context, history, detectedLang);
    const fontes = extractSources(answer, finalDocs);

    return {
      texto_final: answer,
      fontes,
      usage: { totalTokens: enc.encode(context + answer).length },
    };
  } catch (error) {
    console.error("Pipeline Error:", error);
    return { texto_final: "An error occurred.", fontes: [], usage: { totalTokens: 0 } };
  }
}

module.exports = { chatWithAi };
