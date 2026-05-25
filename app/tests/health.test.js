const request = require("supertest");

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