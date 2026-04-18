const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { pool } = require("../db/init");
const { client: qdrantClient, COLLECTION_NAME } = require("../db/qdrant");
const { appendLog, consoleLog } = require("../utils/logger");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

// GET /api/notebooks?userId=
router.get("/", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId é obrigatório." });

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
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notebooks/:id
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT ID as id, titulo, utilizadores_ID as userId, created_at, updated_at FROM NoteBooks WHERE ID = ? LIMIT 1",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Notebook não encontrado." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notebooks
router.post("/", async (req, res) => {
  const { titulo, userId } = req.body;
  if (!titulo || !userId) {
    return res.status(400).json({ error: "titulo e userId são obrigatórios." });
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
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notebooks/:id
// Cascades via FK, but we also purge Qdrant vectors and stored PDF files.
router.delete("/:id", async (req, res) => {
  const notebookId = req.params.id;
  try {
    // Collect fontes to clean up files & vectors
    const [fontes] = await pool.query(
      "SELECT ID FROM Fontes WHERE notebooks_ID = ?",
      [notebookId]
    );

    // Delete from Qdrant (all chunks belonging to this notebook)
    try {
      await qdrantClient.delete(COLLECTION_NAME, {
        filter: {
          must: [{ key: "metadata.notebookId", match: { value: String(notebookId) } }],
        },
      });
    } catch (e) {
      console.warn("Qdrant purge warning:", e.message);
    }

    // Delete PDF files from disk
    for (const f of fontes) {
      const filePath = path.join(UPLOAD_DIR, `${f.ID}.pdf`);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
    }

    // ON DELETE CASCADE will remove Fontes / Mensagens / Notebook_assets
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
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
