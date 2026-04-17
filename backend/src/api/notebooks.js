const express = require("express");
const router = express.Router();
const { pool } = require("../db/init");

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

    res.status(201).json({
      message: "Notebook criado!",
      notebook: { id: result.insertId, titulo, userId },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notebooks/:id
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM NoteBooks WHERE ID = ?", [req.params.id]);
    res.json({ message: "Notebook eliminado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
