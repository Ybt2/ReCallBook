const express = require("express");
const router = express.Router();
const { pool } = require("../db/init");
const { client: qdrantClient } = require("../db/qdrant");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

async function checkMysql() {
  try {
    await pool.query("SELECT 1");
    return { status: "ok" };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

async function checkQdrant() {
  try {
    await qdrantClient.getCollections();
    return { status: "ok" };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

async function checkOllama() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { status: "ok" };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

router.get("/", async (req, res) => {
  const [mysql, qdrant, ollama] = await Promise.all([
    checkMysql(),
    checkQdrant(),
    checkOllama(),
  ]);

  const allOk = [mysql, qdrant, ollama].every(s => s.status === "ok");

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "healthy" : "degraded",
    services: { mysql, qdrant, ollama },
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;