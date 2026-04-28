const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { pool } = require("../db/init");
const { client: qdrantClient, COLLECTION_NAME } = require("../db/qdrant");
const { appendLog, consoleLog } = require("../utils/logger");
const { AppError } = require("../middleware/errorHandler");
const { requireNotebookOwner } = require("../middleware/ownership");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

router.get("/", async (req, res, next) => {
  const userId = req.user.id;

  try {
    const [rows] = await pool.query(
      `SELECT n.ID as id, n.titulo, n.created_at, n.updated_at,
              (SELECT COUNT(*) FROM Fontes f WHERE f.notebooks_ID = n.ID) as fileCount
       FROM NoteBooks n
       WHERE n.utilizadores_ID = ?
       ORDER BY n.updated_at DESC, n.created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", requireNotebookOwner, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT ID as id, titulo, utilizadores_ID as userId, created_at, updated_at FROM NoteBooks WHERE ID = ? LIMIT 1",
      [req.params.id]
    );
    if (rows.length === 0) return next(new AppError("Notebook não encontrado.", "NOT_FOUND", 404));
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  const { titulo } = req.body;
  const userId = req.user.id;
  if (!titulo) {
    return next(new AppError("titulo é obrigatório.", "VALIDATION_ERROR", 400));
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO NoteBooks (titulo, utilizadores_ID) VALUES (?, ?)",
      [titulo, userId]
    );

    const notebookId = result.insertId;
    await appendLog("NoteBooks", "ID", notebookId, "created", { titulo, userId });
    await appendLog("Utilizadores", "ID", userId, "notebook_created", { notebookId, titulo });
    consoleLog("notebooks", "created", { notebookId, titulo });

    res.status(201).json({
      message: "Notebook criado!",
      notebook: { id: notebookId, titulo, userId },
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireNotebookOwner, async (req, res, next) => {
  const notebookId = req.params.id;
  try {
    const [fontes] = await pool.query(
      "SELECT ID FROM Fontes WHERE notebooks_ID = ?",
      [notebookId]
    );

    try {
      await qdrantClient.delete(COLLECTION_NAME, {
        filter: {
          must: [{ key: "metadata.notebookId", match: { value: String(notebookId) } }],
        },
      });
    } catch (e) {
      console.warn("Qdrant purge warning:", e.message);
    }

    for (const f of fontes) {
      const filePath = path.join(UPLOAD_DIR, `${f.ID}.pdf`);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
    }

    const [r] = await pool.query("DELETE FROM NoteBooks WHERE ID = ?", [notebookId]);

    consoleLog("notebooks", "deleted", {
      notebookId,
      affected: r.affectedRows,
      fontesRemoved: fontes.length,
    });

    res.json({
      message: "Notebook eliminado.",
      fontesRemoved: fontes.length,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
