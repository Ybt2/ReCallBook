const { getVectorStore } = require("../db/qdrant");
const { searchDocuments } = require("../utils/searchUtils");
const { detectLanguage, classifyAndBuildQueries, generateAnswer } = require("../utils/promptUtils");
const { buildContext, extractSources } = require("../utils/contextUtils");
const crossEncoder = require('./cross_encoder');
const { getEncoding } = require("js-tiktoken");

const enc = getEncoding("cl100k_base");

async function chatWithAi(notebookId, userMessage, history) {
  try {
    const vectorStore = await getVectorStore();

    const detectedLang = await detectLanguage(userMessage);
    console.log(`🌐 Idioma detetado: ${detectedLang}`);

    const queries = await classifyAndBuildQueries(userMessage, vectorStore, notebookId, detectedLang);
    console.log(`🔍 Queries para busca: ${queries.join(" | ")}`);

    const vectorDocs = await searchDocuments(vectorStore, queries, notebookId);
    console.log(`📦 Vetores únicos encontrados: ${vectorDocs.length}`);

    const finalDocs = await crossEncoder.rerank(userMessage, vectorDocs.slice(0, 20));
    console.log(`🏆 Selecionados top ${finalDocs.length} para o contexto final.`);

    if (finalDocs.length === 0) {
      console.warn("⚠️ Nenhum documento relevante após filtros.");
      if (vectorDocs.length > 0) finalDocs.push(...vectorDocs.slice(0, 3));
      else return { texto_final: "No relevant information found.", fontes: [], usage: { totalTokens: 0 } };
    }

    const context = buildContext(finalDocs);
    const answer = await generateAnswer(userMessage, context, history, detectedLang);
    console.log("📝 Resposta gerada pelo LLM.");

    const fontes = extractSources(answer, finalDocs);
    console.log(`🔗 Fontes citadas: ${fontes.length}`);

    return {
      texto_final: answer,
      fontes,
      usage: { totalTokens: enc.encode(context + answer).length }
    };
  } catch (error) {
    console.error("❌ Pipeline Error:", error);
    return { texto_final: "An error occurred.", fontes: [], usage: { totalTokens: 0 } };
  }
}

module.exports = {
  chatWithAi,
};

module.exports = { chatWithAi };