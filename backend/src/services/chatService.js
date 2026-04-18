const { getVectorStore } = require("../db/qdrant");
const { searchDocuments } = require("../utils/searchUtils");
const { detectLanguage, buildQueries, generateAnswer, streamAnswer } = require("../utils/promptUtils");
const { buildContext, extractSources } = require("../utils/contextUtils");
const crossEncoder = require("./cross_encoder");
const { getEncoding } = require("js-tiktoken");

const enc = getEncoding("cl100k_base");

/**
 * Run the RAG pipeline.
 * @param {object} opts
 * @param {(stage, info?) => void} opts.onStage
 * @param {(token) => void} opts.onToken    when provided -> streaming
 * @param {string} opts.model                 ollama model id
 */
async function chatWithAi(notebookId, userMessage, history, docIds = null, opts = {}) {
  console.log("[chatWithAi] opts keys:", Object.keys(opts), "onStage type:", typeof opts.onStage, "onToken type:", typeof opts.onToken);
  const { onStage = () => {}, onToken = null, model = null } = opts;
  console.log("[chatWithAi] destructured onStage type:", typeof onStage, "onToken type:", typeof onToken);

  try {
    console.log("[chatWithAi] calling onStage('retrieving_store')");
    onStage("retrieving_store");
    const vectorStore = await getVectorStore();

    onStage("detecting_language");
    const detectedLang = await detectLanguage(userMessage);

    onStage("building_queries");
    const queries = await buildQueries(userMessage, detectedLang, vectorStore, notebookId);

    onStage("searching_documents", { queries: queries.length });
    const vectorDocs = await searchDocuments(vectorStore, queries, notebookId, docIds);

    onStage("reranking", { candidates: Math.min(vectorDocs.length, 20) });
    const finalDocs = await crossEncoder.rerank(queries.join(" "), vectorDocs.slice(0, 20));

    if (finalDocs.length === 0) {
      if (vectorDocs.length > 0) finalDocs.push(...vectorDocs.slice(0, 3));
      else {
        onStage("no_results");
        return {
          texto_final: "No relevant information found.",
          fontes: [],
          usage: { totalTokens: 0 },
          model: model || null,
        };
      }
    }

    onStage("generating_answer", { model: model || "default" });
    const context = buildContext(finalDocs);

    let answer;
    if (onToken) {
      answer = await streamAnswer(userMessage, context, history, detectedLang, model, onToken);
    } else {
      answer = await generateAnswer(userMessage, context, history, detectedLang, model);
    }

    onStage("extracting_sources");
    const fontes = extractSources(answer, finalDocs);

    onStage("done");
    return {
      texto_final: answer,
      fontes,
      usage: { totalTokens: enc.encode(context + answer).length },
      model: model || null,
    };
  } catch (error) {
    console.error("Pipeline Error:", error);
    onStage("error", { message: error.message });
    return {
      texto_final: "An error occurred.",
      fontes: [],
      usage: { totalTokens: 0 },
      model: model || null,
    };
  }
}

module.exports = { chatWithAi };
