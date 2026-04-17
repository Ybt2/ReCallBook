const express = require("express");
const router = express.Router();
const { pool } = require("../db/init");

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email e password são obrigatórios." });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO Utilizadores (username, email, password) VALUES (?, ?, ?)",
      [username, email, password]
    );

    res.status(201).json({
      message: "Utilizador criado!",
      user: { id: result.insertId, username, email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar utilizador (Email ou User já existem?)" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email e password são obrigatórios." });
  }

  try {
    const [rows] = await pool.query(
      "SELECT ID, username, email, password FROM Utilizadores WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0 || rows[0].password !== password) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    const u = rows[0];
    await pool.query("UPDATE Utilizadores SET accessed_at = CURRENT_TIMESTAMP WHERE ID = ?", [u.ID]);

    res.json({ user: { id: u.ID, username: u.username, email: u.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no login." });
  }
});

module.exports = router;
