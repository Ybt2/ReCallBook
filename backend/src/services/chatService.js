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

async function chatWithAi(notebookId, userMessage, history) {
  try {
    const startVector = Date.now();
const vectorStore = await getVectorStore();
log(`Vector store ready: ${Date.now() - startVector} ms`);

    const startLang = Date.now();
const detectedLang = await detectLanguage(userMessage);
log(`Language detection: ${Date.now() - startLang} ms`);
    console.log(`Idioma detetado: ${detectedLang}`);

    const startQueries = Date.now();
const queries = await buildQueries(userMessage, detectedLang, vectorStore, notebookId);
log(`Query generation: ${Date.now() - startQueries} ms`);
    console.log(`Queries para busca: ${queries.join(" | ")}`);

    const startSearch = Date.now();
const vectorDocs = await searchDocuments(vectorStore, queries, notebookId);
log(`Vector search: ${Date.now() - startSearch} ms`);
    console.log(`Vetores únicos encontrados: ${vectorDocs.length}`);

    const startRerank = Date.now();
const finalDocs = await crossEncoder.rerank(
  queries.join(" "),
   vectorDocs.slice(0, 20)
);
log(`Rerank: ${Date.now() - startRerank} ms`);
    console.log(`Selecionados top ${finalDocs.length} para o contexto final.`);

    if (finalDocs.length === 0) {
      console.warn("Nenhum documento relevante após filtros.");
      if (vectorDocs.length > 0) finalDocs.push(...vectorDocs.slice(0, 3));
      else return { texto_final: "No relevant information found.", fontes: [], usage: { totalTokens: 0 } };
    }

const startAnswer = Date.now();
const context = buildContext(finalDocs);
const answer = await generateAnswer(userMessage, context, history, detectedLang);
log(`Answer generation: ${Date.now() - startAnswer} ms`);
    console.log("Resposta gerada pelo LLM.");

    const startSources = Date.now();
const fontes = extractSources(answer, finalDocs);
log(`Source extraction: ${Date.now() - startSources} ms`);
    console.log(`Fontes citadas: ${fontes.length}`);

    return {
      texto_final: answer,
      fontes,
      usage: { totalTokens: enc.encode(context + answer).length }
    };
  } catch (error) {
    console.error("Pipeline Error:", error);
    return { texto_final: "An error occurred.", fontes: [], usage: { totalTokens: 0 } };
  }
}

module.exports = {
  chatWithAi,
};

module.exports = { chatWithAi };