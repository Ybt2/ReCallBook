const { ChatOllama } = require("@langchain/ollama");

//This is not exactly an agent, has it has no acess to tools, but rather a LLM with structured outputs, making so that it can generate json and then that same json can be read by the code to make anything

const llm = new ChatOllama({
  model: "gpt-oss:20b",
  baseUrl: "http://localhost:11434",
  temperature: 0,
});

module.exports = llm;