const request = require("supertest");
const { signToken } = require("../src/middleware/auth");

jest.mock("../src/db/init", () => ({
  pool: { query: jest.fn() },
  initDB: jest.fn(),
}));
jest.mock("../src/db/qdrant", () => ({
  initQdrant: jest.fn(),
  getQdrantClient: jest.fn(() => ({})),
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
jest.mock("../src/services/chatService", () => ({
  chatWithAi: jest.fn(),
}));
jest.mock("../src/utils/promptUtils", () => ({
  generateAnswer: jest.fn(),
  streamAnswer: jest.fn(),
  detectLanguage: jest.fn(() => "English"),
}));
jest.mock("../src/utils/searchUtils", () => ({
  searchDocuments: jest.fn(() => []),
}));
jest.mock("../src/services/agent", () => ({
  llm: { withStructuredOutput: jest.fn(() => ({})) },
  llmQueryBuilder: {},
  createLlm: jest.fn(() => ({ withStructuredOutput: jest.fn(() => ({})) })),
}));
jest.mock("../src/services/tools/quizTool", () => ({
  generateQuizAction: jest.fn(),
}));
jest.mock("../src/services/tools/flashcardTool", () => ({
  generateFlashcardsAction: jest.fn(),
}));
jest.mock("franc", () => ({ franc: jest.fn(() => "eng") }));
jest.mock("uuid", () => ({ v4: jest.fn(() => "00000000-0000-0000-0000-000000000000") }));

const app = require("../src/app");

const validToken = signToken({ id: 1, username: "tester", email: "t@t.com" });
const otherToken = signToken({ id: 2, username: "other", email: "o@t.com" });

describe("Auth required on protected routes", () => {
  const protectedRoutes = [
    ["GET", "/api/notebooks"],
    ["GET", "/api/documents"],
    ["GET", "/api/chat/messages"],
    ["GET", "/api/ollama/models"],
  ];

  test.each(protectedRoutes)("%s %s returns 401 without token", async (method, path) => {
    const res = await request(app)[method.toLowerCase()](path);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("AUTH_REQUIRED");
  });

  test.each(protectedRoutes)("%s %s returns 401 with invalid token", async (method, path) => {
    const res = await request(app)
      [method.toLowerCase()](path)
      .set("Authorization", "Bearer invalidtoken");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_INVALID");
  });
});

describe("POST /api/auth/register", () => {
  const { pool } = require("../src/db/init");

  beforeEach(() => {
    pool.query.mockReset();
  });

  it("returns 400 when fields are missing", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "test" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 201 with token on success", async () => {
    pool.query
      .mockResolvedValueOnce([{ insertId: 99 }])
      .mockResolvedValueOnce([]);
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "newuser", email: "new@test.com", password: "pass123" });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.id).toBe(99);
  });

  it("returns 409 on duplicate", async () => {
    const dupErr = new Error("Duplicate entry");
    dupErr.code = "ER_DUP_ENTRY";
    pool.query.mockRejectedValueOnce(dupErr);
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "dup", email: "dup@test.com", password: "pass123" });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("DUPLICATE_USER");
  });
});

describe("GET /api/notebooks", () => {
  const { pool } = require("../src/db/init");

  beforeEach(() => {
    pool.query.mockReset();
  });

  it("returns notebooks for authenticated user", async () => {
    pool.query.mockResolvedValueOnce([[
      { id: "nb-1", titulo: "Test Notebook", created_at: "2025-01-01" },
    ]]);
    const res = await request(app)
      .get("/api/notebooks")
      .set("Authorization", `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("IDOR - Ownership checks", () => {
  const { pool } = require("../src/db/init");

  beforeEach(() => {
    pool.query.mockReset();
  });

  it("GET /api/notebooks/:id returns 403 for non-owner", async () => {
    pool.query.mockResolvedValueOnce([[{ utilizadores_ID: 999 }]]);
    const res = await request(app)
      .get("/api/notebooks/1")
      .set("Authorization", `Bearer ${validToken}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });

  it("GET /api/notebooks/:id returns 200 for owner", async () => {
    pool.query
      .mockResolvedValueOnce([[{ utilizadores_ID: 1 }]])
      .mockResolvedValueOnce([[{ id: 1, titulo: "My NB", utilizadores_ID: 1, created_at: "2025-01-01", updated_at: null }]]);
    const res = await request(app)
      .get("/api/notebooks/1")
      .set("Authorization", `Bearer ${validToken}`);
    expect(res.status).toBe(200);
  });

  it("DELETE /api/notebooks/:id returns 403 for non-owner", async () => {
    pool.query.mockResolvedValueOnce([[{ utilizadores_ID: 999 }]]);
    const res = await request(app)
      .delete("/api/notebooks/1")
      .set("Authorization", `Bearer ${validToken}`);
    expect(res.status).toBe(403);
  });

  it("GET /api/chat/messages returns 403 for non-owner notebook", async () => {
    pool.query.mockResolvedValueOnce([[{ utilizadores_ID: 999 }]]);
    const res = await request(app)
      .get("/api/chat/messages?notebookId=1")
      .set("Authorization", `Bearer ${validToken}`);
    expect(res.status).toBe(403);
  });

  it("GET /api/tools returns 403 for non-owner notebook", async () => {
    pool.query.mockResolvedValueOnce([[{ utilizadores_ID: 999 }]]);
    const res = await request(app)
      .get("/api/tools?notebookId=1")
      .set("Authorization", `Bearer ${validToken}`);
    expect(res.status).toBe(403);
  });

  it("GET /api/documents returns 403 for non-owner notebook", async () => {
    pool.query.mockResolvedValueOnce([[{ utilizadores_ID: 999 }]]);
    const res = await request(app)
      .get("/api/documents?notebookId=1")
      .set("Authorization", `Bearer ${validToken}`);
    expect(res.status).toBe(403);
  });
});
