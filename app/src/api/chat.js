const express = require("express");
const router = express.Router();
const { pool } = require("../db/init");
const { chatWithAi } = require("../services/chatService");
const { appendLog, consoleLog } = require("../utils/logger");
const { getLabels } = require("../utils/languageLabels");
const { AppError } = require("../middleware/errorHandler");

async function getUserModels(userId) {
  const [rows] = await pool.query(
    "SELECT general_model, query_model, vision_model FROM Utilizadores WHERE ID = ? LIMIT 1",
    [userId]
  );
  if (rows.length === 0) return { general_model: null, query_model: null, vision_model: null };
  return {
    general_model: rows[0].general_model || null,
    query_model: rows[0].query_model || null,
    vision_model: rows[0].vision_model || null,
  };
}

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
  if (!notebookId) return next(new AppError("notebookId is required.", "VALIDATION_ERROR", 400));

  const [nbRows] = await pool.query("SELECT utilizadores_ID FROM NoteBooks WHERE ID = ? LIMIT 1", [notebookId]);
  if (nbRows.length === 0) return next(new AppError("Notebook not found.", "NOT_FOUND", 404));
  if (nbRows[0].utilizadores_ID !== req.user.id) return next(new AppError("Access denied.", "FORBIDDEN", 403));

  try {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * pageSize;

    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) as total FROM Mensagens WHERE notebooks_ID = ? AND is_deleted = 0",
      [notebookId]
    );
    const [rows] = await pool.query(
      `SELECT ID as id, role, conteudo, modelo_ai, num_tokens, tempo_processamento, created_at
       FROM Mensagens WHERE notebooks_ID = ? AND is_deleted = 0 ORDER BY created_at ASC LIMIT ? OFFSET ?`,
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
  const { notebookId, mensagem, docIds, model, queryModel } = req.body;

  const [nbRows] = await pool.query("SELECT utilizadores_ID FROM NoteBooks WHERE ID = ? LIMIT 1", [notebookId]);
  if (nbRows.length === 0) return next(new AppError("Notebook not found.", "NOT_FOUND", 404));
  if (nbRows[0].utilizadores_ID !== req.user.id) return next(new AppError("Access denied.", "FORBIDDEN", 403));

  try {
    const [[uRow]] = await pool.query("SELECT language FROM Utilizadores WHERE ID = ? LIMIT 1", [req.user.id]);
    const userLanguage = uRow?.language || "English";
    const labels = getLabels(userLanguage);

    const userModels = await getUserModels(req.user.id);
    const chatModel = model || userModels.general_model;
    const chatQueryModel = queryModel || userModels.query_model || userModels.general_model;
    if (!chatModel) return next(new AppError("No model configured. Please configure a model in your settings.", "NO_MODEL", 400));

    const [rows] = await pool.query(
      "SELECT role, conteudo FROM Mensagens WHERE notebooks_ID = ? AND is_deleted = 0 ORDER BY created_at DESC LIMIT 6",
      [notebookId]
    );
    const history = rows
      .reverse()
      .map((m) => {
        if (m.role === "utilizador") return `${labels.user}: ${m.conteudo}`;
        try {
          const parsed = JSON.parse(m.conteudo);
          return `${labels.assistant}: ${parsed.texto_final || parsed.content || m.conteudo}`;
        } catch {
          return `${labels.assistant}: ${m.conteudo}`;
        }
      })
      .join("\n");

    const aiResponse = await chatWithAi(notebookId, mensagem, history, docIds, { model: chatModel, queryModel: chatQueryModel, userLanguage });
    const elapsedSecs = (Date.now() - startTime) / 1000;
    const tempoProc = secsToTime(elapsedSecs);
    const usedModel = aiResponse.model || chatModel;
    const totalTokens = aiResponse.usage?.totalTokens ?? 0;

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
        totalTokens,
      ]
    );

    await appendLog("NoteBooks", "ID", notebookId, "chat_answered", {
      messageId: result.insertId,
      model: usedModel,
      tokens: totalTokens,
    });

    res.json({
      id: result.insertId,
      role: "assistant",
      content: aiResponse.texto_final,
      sources: aiResponse.fontes,
      model: usedModel,
      tokens: totalTokens,
      processingTime: elapsedSecs.toFixed(2),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/chat/stream  -> Server-Sent Events (stages + tokens + done)
router.post("/stream", async (req, res) => {
  const startTime = Date.now();
  const { notebookId, mensagem, docIds, model, editMessageId, queryModel } = req.body;

  if (!notebookId || !mensagem) {
    return res.status(400).json({ error: "notebookId and mensagem are required.", code: "VALIDATION_ERROR", status: 400 });
  }

  try {
    const [nbRows] = await pool.query("SELECT utilizadores_ID FROM NoteBooks WHERE ID = ? LIMIT 1", [notebookId]);
    if (nbRows.length === 0) return res.status(404).json({ error: "Notebook not found.", code: "NOT_FOUND", status: 404 });
    if (nbRows[0].utilizadores_ID !== req.user.id) return res.status(403).json({ error: "Access denied.", code: "FORBIDDEN", status: 403 });

    const userModels = await getUserModels(req.user.id);
    const chatModel = model || userModels.general_model;
    const chatQueryModel = queryModel || userModels.query_model || userModels.general_model;
    if (!chatModel) {
      return res.status(400).json({ error: "No model configured. Please configure a model in your settings.", code: "NO_MODEL", status: 400 });
    }

    const [[uRow]] = await pool.query("SELECT language FROM Utilizadores WHERE ID = ? LIMIT 1", [req.user.id]);
    const userLanguage = uRow?.language || "English";
    const labels = getLabels(userLanguage);

    if (editMessageId) {
      const [msgRows] = await pool.query(
        "SELECT ID FROM Mensagens WHERE notebooks_ID = ? AND ID = ? AND is_deleted = 0 LIMIT 1",
        [notebookId, editMessageId]
      );
      if (msgRows.length > 0) {
        await pool.query(
          "UPDATE Mensagens SET is_deleted = 1 WHERE notebooks_ID = ? AND ID = ?",
          [notebookId, editMessageId]
        );
        await pool.query(
          `UPDATE Mensagens SET is_deleted = 1
           WHERE notebooks_ID = ? AND role = 'assistant' AND id > ? AND id < (
             SELECT COALESCE(MIN(sub.id), 999999999)
             FROM (SELECT id FROM Mensagens WHERE notebooks_ID = ? AND role = 'utilizador' AND id > ? AND is_deleted = 0) sub
           )`,
          [notebookId, editMessageId, notebookId, editMessageId]
        );
      }
    }

    const [rows] = await pool.query(
      "SELECT role, conteudo FROM Mensagens WHERE notebooks_ID = ? AND is_deleted = 0 ORDER BY created_at DESC LIMIT 6",
      [notebookId]
    );
    const history = rows
      .reverse()
      .map((m) => {
        if (m.role === "utilizador") return `${labels.user}: ${m.conteudo}`;
        try {
          const parsed = JSON.parse(m.conteudo);
          return `${labels.assistant}: ${parsed.texto_final || parsed.content || m.conteudo}`;
        } catch {
          return `${labels.assistant}: ${m.conteudo}`;
        }
      })
      .join("\n");

    // Only now we flush SSE headers — all preliminary work succeeded
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const send = (event, data) => {
      if (closed || res.writableEnded || res.destroyed) return;
      try {
        const payload = JSON.stringify(data);
        res.write(`event: ${event}\n`);
        res.write(`data: ${payload}\n\n`);
        if (typeof res.flush === "function") res.flush();
      } catch (writeErr) {
        console.error("SSE write failed (client likely disconnected):", writeErr.message);
        closed = true;
      }
    };

    let closed = false;
    res.on("close", () => { closed = true; });
    res.on("finish", () => { closed = true; });
    req.on("close", () => { closed = true; });
    req.on("aborted", () => { closed = true; });
    res.on("error", (err) => {
      console.error("Response stream error:", err.message);
      closed = true;
    });

    const [userIns] = await pool.query(
      "INSERT INTO Mensagens (notebooks_ID, role, conteudo) VALUES (?, 'utilizador', ?)",
      [notebookId, mensagem]
    );
    send("user_saved", { id: userIns.insertId });

    const aiResponse = await chatWithAi(notebookId, mensagem, history, docIds, {
      model: chatModel,
      queryModel: chatQueryModel,
      userLanguage,
      onStage: (stage, info = {}) => {
        if (!closed) send("stage", { stage, ...info });
      },
      onToken: (token) => {
        if (!closed) send("token", { token });
      },
    });

    const elapsedSecs = (Date.now() - startTime) / 1000;
    const tempoProc = secsToTime(elapsedSecs);
    const usedModel = aiResponse.model || chatModel;
    const totalTokens = aiResponse.usage?.totalTokens ?? 0;

    // Persist to DB before sending "done" so the client gets the real
    // insertId and we can report errors back instead of failing silently.
    try {
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
          totalTokens,
        ]
      );

      await appendLog("NoteBooks", "ID", notebookId, "chat_answered", {
        messageId: result.insertId,
        model: usedModel,
        tokens: totalTokens,
        processingTime: elapsedSecs.toFixed(2),
      });

      send("done", {
        id: result.insertId,
        content: aiResponse.texto_final,
        sources: aiResponse.fontes,
        model: usedModel,
        tokens: totalTokens,
        processingTime: elapsedSecs.toFixed(2),
      });
    } catch (dbError) {
      console.error("DB persistence failed:", dbError);
      send("error", { message: "Failed to save message." });
    }
    res.end();
  } catch (error) {
    console.error("Stream error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "An error occurred.", code: "STREAM_ERROR", status: 500 });
    } else {
      try {
        send("error", { message: error.message || "Stream failed" });
        res.end();
      } catch (e) {
        console.error("Failed to send terminal error event:", e.message);
      }
    }
  }
});

module.exports = router;