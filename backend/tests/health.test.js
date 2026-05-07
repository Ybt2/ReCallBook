const request = require("supertest");

jest.mock("../src/db/init", () => ({
  pool: { query: jest.fn() },
  initDB: jest.fn(),
}));
jest.mock("../src/db/qdrant", () => ({
  initQdrant: jest.fn(),
  getVectorStore: jest.fn(),
  client: { delete: jest.fn(), scroll: jest.fn(), getCollections: jest.fn() },
  COLLECTION_NAME: "test_collection",
}));
jest.mock("../src/services/cross_encoder", () => ({
  initCross_encoder: jest.fn(),
  rerank: jest.fn(),
}));
jest.mock("../src/services/embeddings", () => ({
  getEmbeddings: jest.fn(() => ({ embedQuery: jest.fn(() => [0.1, 0.2]) })),
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

const app = require("../src/app");
const { pool } = require("../src/db/init");
const { client: qdrantClient } = require("../src/db/qdrant");

describe("GET /api/health", () => {
  beforeEach(() => {
    pool.query.mockReset();
    qdrantClient.getCollections.mockReset();
    fetch.mockReset();
  });

  it("returns healthy when all services are up", async () => {
    pool.query.mockResolvedValueOnce([[{ 1: 1 }]]);
    qdrantClient.getCollections.mockResolvedValueOnce({ collections: [] });
    fetch.mockResolvedValueOnce({ ok: true });

    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.services.mysql.status).toBe("ok");
    expect(res.body.services.qdrant.status).toBe("ok");
    expect(res.body.services.ollama.status).toBe("ok");
  });

  it("returns 503 degraded when MySQL is down", async () => {
    pool.query.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    qdrantClient.getCollections.mockResolvedValueOnce({ collections: [] });
    fetch.mockResolvedValueOnce({ ok: true });

    const res = await request(app).get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("degraded");
    expect(res.body.services.mysql.status).toBe("error");
  });

  it("does not require authentication", async () => {
    pool.query.mockResolvedValueOnce([[{ 1: 1 }]]);
    qdrantClient.getCollections.mockResolvedValueOnce({ collections: [] });
    fetch.mockResolvedValueOnce({ ok: true });

    const res = await request(app).get("/api/health");
    expect(res.status).not.toBe(401);
  });
});