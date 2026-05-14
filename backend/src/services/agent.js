const { ChatOllama } = require("@langchain/ollama");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

function createLlm(model) {
  if (!model) throw new Error("Model name is required to create LLM instance.");
  return new ChatOllama({
    model,
    baseUrl: OLLAMA_URL,
    temperature: 0,
  });
}

module.exports = {
  createLlm,
  OLLAMA_URL,
};

