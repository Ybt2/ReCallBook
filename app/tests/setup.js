process.env.JWT_SECRET = "test-secret-for-jest";

jest.mock("../src/db/init", () => ({
  pool: { query: jest.fn() },
  initDB: jest.fn(),
}));
jest.mock("../src/db/qdrant", () => ({
  initQdrant: jest.fn(),
  getVectorStore: jest.fn(),
  getQdrantClient: jest.fn(() => ({})),
  client: { delete: jest.fn(), scroll: jest.fn(), getCollections: jest.fn() },
  COLLECTION_NAME: "test_collection",
}));
jest.mock("../src/services/cross_encoder", () => ({
  initCross_encoder: jest.fn(),
  rerank: jest.fn(() => Promise.resolve([])),
}));
jest.mock("../src/services/embeddings", () => ({
  embedQuery: jest.fn(() => [0.1, 0.2]),
}));
jest.mock("../src/utils/logger", () => ({
  appendLog: jest.fn(),
  consoleLog: jest.fn(),
  entry: jest.fn(),
}));
jest.mock("../src/services/chatService", () => ({ chatWithAi: jest.fn() }));
jest.mock("../src/utils/promptUtils", () => ({
  generateAnswer: jest.fn(),
  streamAnswer: jest.fn(),
  detectLanguage: jest.fn(() => "English"),
}));
jest.mock("../src/utils/searchUtils", () => ({ searchDocuments: jest.fn(() => []) }));
jest.mock("../src/services/agent", () => ({
  llm: { withStructuredOutput: jest.fn(() => ({})) },
  llmQueryBuilder: {},
  createLlm: jest.fn(() => ({ withStructuredOutput: jest.fn(() => ({})) })),
}));
jest.mock("../src/services/tools/quizTool", () => ({ generateQuizAction: jest.fn() }));
jest.mock("../src/services/tools/flashcardTool", () => ({ generateFlashcardsAction: jest.fn() }));
jest.mock("uuid", () => ({ v4: jest.fn(() => "00000000-0000-0000-0000-000000000000") }));

global.fetch = jest.fn();