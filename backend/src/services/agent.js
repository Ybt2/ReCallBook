const { ChatOllama } = require("@langchain/ollama");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || "qwen3:14b";
const DEFAULT_QUERY_MODEL = process.env.DEFAULT_QUERY_MODEL || "llama3.2:3b";
const DEFAULT_VISION_MODEL = process.env.DEFAULT_VISION_MODEL || "qwen3.5:0.8b";

function createLlm(model) {
  return new ChatOllama({
    model: model || DEFAULT_MODEL,
    baseUrl: OLLAMA_URL,
    temperature: 0,
  });
}

const llm = createLlm(DEFAULT_MODEL);

const llmQueryBuilder = createLlm(DEFAULT_QUERY_MODEL);

const llmvision = createLlm(DEFAULT_VISION_MODEL);

module.exports = {
  llm,
  llmQueryBuilder,
  llmvision,
  createLlm,
  OLLAMA_URL,
  DEFAULT_MODEL,
  DEFAULT_QUERY_MODEL,
  DEFAULT_VISION_MODEL,
};

