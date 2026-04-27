const express = require("express");
const router = express.Router();
const { pool } = require("../db/init");
const { chatWithAi } = require("../services/chatService");
const { appendLog, consoleLog } = require("../utils/logger");
const { AppError } = require("../middleware/errorHandler");

const DEFAULT_MODEL = process.env.DEFAULT_MODEL || "qwen3:14b";

function secsToTime(secs) {
  const s = Math.round(Number(secs));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function timeToSecs(timeStr) {
  if (!timeStr) return null;
  const str = String(timeStr);
  const parts = str.split(":");
  if (parts.length === 3) {
    return (Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2])).toFixed(0);
  }
  return str;
}

// GET /api/chat/messages?notebookId=&page=&limit=
router.get("/messages", async (req, res, next) => {
  const { notebookId, page, limit } = req.query;
  if (!notebookId) return next(new AppError("notebookId é obrigatório.", "VALIDATION_ERROR", 400));

  try {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * pageSize;

    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) as total FROM Mensagens WHERE notebooks_ID = ?",
      [notebookId]
    );
    const [rows] = await pool.query(
      `SELECT ID as id, role, conteudo, modelo_ai, num_tokens, tempo_processamento, created_at
       FROM Mensagens WHERE notebooks_ID = ? ORDER BY created_at ASC LIMIT ? OFFSET ?`,
      [notebookId, pageSize, offset]
    );

    const messages = rows.map((m) => {
      if (m.role === "assistant") {
        try {
          const parsed = JSON.parse(m.conteudo);
          return {
            id: m.id,
            role: "assistant",
            content: parsed.texto_final,
            sources: parsed.fontes || [],
            model: m.modelo_ai,
            tokens: m.num_tokens,
            processingTime: timeToSecs(m.tempo_processamento),
            created_at: m.created_at,
          };
        } catch {
          return {
            id: m.id,
            role: "assistant",
            content: m.conteudo,
            sources: [],
            model: m.modelo_ai,
            tokens: m.num_tokens,
            processingTime: timeToSecs(m.tempo_processamento),
            created_at: m.created_at,
          };
        }
      }
      return {
        id: m.id,
        role: "user",
        content: m.conteudo,
        sources: [],
        created_at: m.created_at,
      };
    });

    res.json({ data: messages, pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/pergunta (non-streaming, kept for compatibility)
router.post("/pergunta", async (req, res, next) => {
  const startTime = Date.now();
  const { notebookId, mensagem, docIds, model } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT role, conteudo FROM Mensagens WHERE notebooks_ID = ? ORDER BY created_at DESC LIMIT 6",
      [notebookId]
    );
    const history = rows
      .reverse()
      .map((m) => `${m.role === "utilizador" ? "User" : "Assistant"}: ${m.conteudo}`)
      .join("\n");

    const aiResponse = await chatWithAi(notebookId, mensagem, history, docIds, { model });
    const elapsedSecs = (Date.now() - startTime) / 1000;
    const tempoProc = secsToTime(elapsedSecs);
    const usedModel = aiResponse.model || model || DEFAULT_MODEL;

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
        usedModel,
        "SUCCESS",
        tempoProc,
        aiResponse.usage.totalTokens,
      ]
    );

    await appendLog("NoteBooks", "ID", notebookId, "chat_answered", {
      messageId: result.insertId,
      model: usedModel,
      tokens: aiResponse.usage.totalTokens,
    });

    res.json({
      id: result.insertId,
      role: "assistant",
      content: aiResponse.texto_final,
      sources: aiResponse.fontes,
      model: usedModel,
      tokens: aiResponse.usage.totalTokens,
      processingTime: elapsedSecs.toFixed(2),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/chat/stream  -> Server-Sent Events (stages + tokens + done)
router.post("/stream", async (req, res) => {
  const startTime = Date.now();
  const { notebookId, mensagem, docIds, model } = req.body;

  if (!notebookId || !mensagem) {
    return res.status(400).json({ error: "notebookId e mensagem são obrigatórios.", code: "VALIDATION_ERROR", status: 400 });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (event, data) => {
    const payload = JSON.stringify(data);
    console.log(`[SSE send] event=${event} data=${payload.slice(0, 200)}`);
    res.write(`event: ${event}\n`);
    res.write(`data: ${payload}\n\n`);
    if (typeof res.flush === "function") res.flush();
  };

  let closed = false;
  res.on("close", () => { closed = true; });
  res.on("finish", () => { closed = true; });
  req.on("aborted", () => { closed = true; });

  try {
    const [rows] = await pool.query(
      "SELECT role, conteudo FROM Mensagens WHERE notebooks_ID = ? ORDER BY created_at DESC LIMIT 6",
      [notebookId]
    );
    const history = rows
      .reverse()
      .map((m) => `${m.role === "utilizador" ? "User" : "Assistant"}: ${m.conteudo}`)
      .join("\n");

    // Persist the user message first so the UI will reload it with real IDs
    const [userIns] = await pool.query(
      "INSERT INTO Mensagens (notebooks_ID, role, conteudo) VALUES (?, 'utilizador', ?)",
      [notebookId, mensagem]
    );
    send("user_saved", { id: userIns.insertId });

    console.log("[stream route] calling chatWithAi with opts containing onStage and onToken");
    const aiResponse = await chatWithAi(notebookId, mensagem, history, docIds, {
      model,
      onStage: (stage, info = {}) => {
        console.log("[stream route] onStage callback fired:", stage);
        if (!closed) send("stage", { stage, ...info });
        else console.log("[stream route] connection closed, skipping stage:", stage);
      },
      onToken: (token) => {
        if (!closed) send("token", { token });
      },
    });

    const elapsedSecs = (Date.now() - startTime) / 1000;
    const tempoProc = secsToTime(elapsedSecs);
    const usedModel = aiResponse.model || model || DEFAULT_MODEL;

    const [result] = await pool.query(
      `INSERT INTO Mensagens
       (notebooks_ID, role, conteudo, modelo_ai, LOGS, tempo_processamento, num_tokens)
       VALUES (?, 'assistant', ?, ?, ?, ?, ?)`,
      [
        notebookId,
        JSON.stringify({ texto_final: aiResponse.texto_final, fontes: aiResponse.fontes }),
        usedModel,
        "SUCCESS",
        tempoProc,
        aiResponse.usage.totalTokens,
      ]
    );

    await appendLog("NoteBooks", "ID", notebookId, "chat_answered", {
      messageId: result.insertId,
      model: usedModel,
      tokens: aiResponse.usage.totalTokens,
      processingTime: elapsedSecs.toFixed(2),
    });

    consoleLog("chat", "stream_done", {
      notebookId,
      model: usedModel,
      tokens: aiResponse.usage.totalTokens,
      time: elapsedSecs.toFixed(2),
    });

    send("done", {
      id: result.insertId,
      content: aiResponse.texto_final,
      sources: aiResponse.fontes,
      model: usedModel,
      tokens: aiResponse.usage.totalTokens,
      processingTime: elapsedSecs.toFixed(2),
    });
    res.end();
  } catch (error) {
    console.error("Stream error:", error);
    try { send("error", { message: "An error occurred while processing the stream." }); } catch (_) {}
    res.end();
  }
});

module.exports = router;