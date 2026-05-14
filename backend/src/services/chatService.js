const { getVectorStore } = require("../db/qdrant");
const { searchDocuments } = require("../utils/searchUtils");
const { buildQueries, generateAnswer, streamAnswer } = require("../utils/promptUtils");
const { buildContext, extractSources } = require("../utils/contextUtils");
const crossEncoder = require("./cross_encoder");

/**
 * Run the RAG pipeline.
 * @param {object} opts
 * @param {(stage, info?) => void} opts.onStage
 * @param {(token) => void} opts.onToken    when provided -> streaming
 * @param {string} opts.model                 ollama model id
 * @param {string} opts.userLanguage          user's preferred language
 */
async function chatWithAi(notebookId, userMessage, history, docIds = null, opts = {}) {
  console.log("[chatWithAi] opts keys:", Object.keys(opts), "onStage type:", typeof opts.onStage, "onToken type:", typeof opts.onToken);
  const { onStage = () => {}, onToken = null, model = null, userLanguage = "English", queryModel = null } = opts;
  console.log("[chatWithAi] destructured onStage type:", typeof onStage, "onToken type:", typeof onToken);

  try {
    console.log("[chatWithAi] calling onStage('retrieving_store')");
    onStage("retrieving_store");
    const vectorStore = await getVectorStore();

    onStage("building_queries");
    const queries = await buildQueries(userMessage, userLanguage, vectorStore, notebookId, queryModel);

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
          usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
          model: model || null,
        };
      }
    }

    onStage("generating_answer", { model: model || "default" });
    const context = buildContext(finalDocs);

    let answer, usage;
    if (onToken) {
      const result = await streamAnswer(userMessage, context, history, userLanguage, model, onToken);
      answer = typeof result === "string" ? result : result.text;
      usage = (typeof result === "object" && result.usage) ? result.usage : null;
    } else {
      const result = await generateAnswer(userMessage, context, history, userLanguage, model);
      answer = typeof result === "string" ? result : result.text;
      usage = (typeof result === "object" && result.usage) ? result.usage : null;
    }

    onStage("extracting_sources");
    const fontes = extractSources(answer, finalDocs);

    onStage("done");
    return {
      texto_final: answer,
      fontes,
      usage: {
        totalTokens: usage?.totalTokens || 0,
        promptTokens: usage?.promptTokens || 0,
        completionTokens: usage?.completionTokens || 0,
      },
      model: model || null,
    };
  } catch (error) {
    console.error("Pipeline Error:", error);
    onStage("error", { message: error.message });
    return {
      texto_final: "An error occurred.",
      fontes: [],
      usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
      model: model || null,
    };
  }
}

module.exports = { chatWithAi };
