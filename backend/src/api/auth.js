const express = require("express");
const router = express.Router();
const { pool } = require("../db/init");

// Rota de Registo: POST /api/auth/register
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const [result] = await pool.query(
      "INSERT INTO Utilizadores (username, email, password) VALUES (?, ?, ?)",
      [username, email, password]
    );
    
    res.status(201).json({ 
      message: "Utilizador criado!", 
      userId: result.insertId 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar utilizador (Email ou User já existem?)" });
  }
});

module.exports = router;