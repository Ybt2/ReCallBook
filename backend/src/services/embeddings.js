const { OllamaEmbeddings } = require("@langchain/ollama");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || "bge-m3";

const embeddings = new OllamaEmbeddings({
  model: EMBEDDING_MODEL,
  baseUrl: OLLAMA_URL,
});

module.exports = embeddings;