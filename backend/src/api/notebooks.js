const express = require("express");
const router = express.Router();
const { pool } = require("../db/init");

// Criar Notebook: POST /api/notebooks
router.post("/", async (req, res) => {
  const { titulo, userId } = req.body;

  try {
    const [result] = await pool.query(
      "INSERT INTO NoteBooks (titulo, utilizadores_ID) VALUES (?, ?)",
      [titulo, userId]
    );

    res.status(201).json({ 
      message: "Notebook criado!", 
      notebookId: result.insertId 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;