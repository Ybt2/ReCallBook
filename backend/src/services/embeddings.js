const { OllamaEmbeddings } = require("@langchain/ollama");

const embeddings = new OllamaEmbeddings({
  model: "bge-m3",
  baseUrl: "http://localhost:11434",
});

module.exports = embeddings;