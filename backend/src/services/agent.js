const { ChatOllama } = require("@langchain/ollama");

const llm = new ChatOllama({
  model: "qwen3:14b",
  baseUrl: "http://localhost:11434",
  temperature: 0,
});

const llmQueryBuilder = new ChatOllama({
  model: "llama3.2:3b",
  baseUrl: "http://localhost:11434",
  temperature: 0,
});

const llmOcr = new ChatOllama({
  model: "glm-ocr",
  baseUrl: "http://localhost:11434",
  temperature: 0,
});

module.exports = {
  llm,
  llmQueryBuilder,
  llmOcr,
};

