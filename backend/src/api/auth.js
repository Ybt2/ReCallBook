const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { pool } = require("../db/init");
const { appendLog, consoleLog } = require("../utils/logger");

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email e password são obrigatórios." });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO Utilizadores (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashed]
    );

    const userId = result.insertId;
    await appendLog("Utilizadores", "ID", userId, "register", { username, email });
    consoleLog("auth", "register", { userId, username });

    res.status(201).json({
      message: "Utilizador criado!",
      user: { id: userId, username, email },
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

    if (rows.length === 0) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    const u = rows[0];
    // Back-compat: rows with plain text pw still work (old users)
    const stored = u.password || "";
    const looksHashed = stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$");
    const ok = looksHashed
      ? await bcrypt.compare(password, stored)
      : stored === password;

    if (!ok) {
      await appendLog("Utilizadores", "ID", u.ID, "login_failed", { email });
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    // Lazy migration: upgrade plain text to bcrypt on successful login
    if (!looksHashed) {
      const hashed = await bcrypt.hash(password, 10);
      await pool.query("UPDATE Utilizadores SET password = ? WHERE ID = ?", [hashed, u.ID]);
    }

    await pool.query("UPDATE Utilizadores SET accessed_at = CURRENT_TIMESTAMP WHERE ID = ?", [u.ID]);
    await appendLog("Utilizadores", "ID", u.ID, "login", {});
    consoleLog("auth", "login", { userId: u.ID });

    res.json({ user: { id: u.ID, username: u.username, email: u.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no login." });
  }
});

module.exports = router;
