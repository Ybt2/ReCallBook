const express = require("express");
const router = express.Router();
const { pool } = require("../db/init");
const { chatWithAi } = require("../services/chatService");

// GET /api/chat/messages?notebookId=
router.get("/messages", async (req, res) => {
  const { notebookId } = req.query;
  if (!notebookId) return res.status(400).json({ error: "notebookId é obrigatório." });

  try {
    const [rows] = await pool.query(
      `SELECT ID as id, role, conteudo, created_at
       FROM Mensagens WHERE notebooks_ID = ? ORDER BY created_at ASC`,
      [notebookId]
    );

    const messages = rows.map((m) => {
      if (m.role === "assistant") {
        try {
          const parsed = JSON.parse(m.conteudo);
          return { id: m.id, role: "assistant", content: parsed.texto_final, sources: parsed.fontes || [], created_at: m.created_at };
        } catch {
          return { id: m.id, role: "assistant", content: m.conteudo, sources: [], created_at: m.created_at };
        }
      }
      return { id: m.id, role: "user", content: m.conteudo, sources: [], created_at: m.created_at };
    });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat/pergunta
router.post("/pergunta", async (req, res) => {
  const startTime = Date.now();
  const { notebookId, mensagem, docIds } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT role, conteudo FROM Mensagens WHERE notebooks_ID = ? ORDER BY created_at DESC LIMIT 6",
      [notebookId]
    );

    const history = rows
      .reverse()
      .map((m) => `${m.role === "utilizador" ? "User" : "Assistant"}: ${m.conteudo}`)
      .join("\n");

    const aiResponse = await chatWithAi(notebookId, mensagem, history, docIds);
    const tempoProc = ((Date.now() - startTime) / 1000).toFixed(2);
    const totalTokens = aiResponse.usage.totalTokens;

    await pool.query(
      "INSERT INTO Mensagens (notebooks_ID, role, conteudo) VALUES (?, 'utilizador', ?)",
      [notebookId, mensagem]
    );

    const [result] = await pool.query(
      `INSERT INTO Mensagens 
       (notebooks_ID, role, conteudo, modelo_ai, LOGS, tempo_processamento, num_tokens) 
       VALUES (?, 'assistant', ?, ?, ?, ?, ?)`,
      [
        notebookId,
        JSON.stringify({ texto_final: aiResponse.texto_final, fontes: aiResponse.fontes }),
        "llama3.2:3b",
        "SUCCESS",
        tempoProc,
        totalTokens,
      ]
    );

    res.json({
      id: result.insertId,
      role: "assistant",
      content: aiResponse.texto_final,
      sources: aiResponse.fontes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao processar o chat." });
  }
});

module.exports = router;
