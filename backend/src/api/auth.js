const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { pool } = require("../db/init");
const { appendLog, consoleLog } = require("../utils/logger");
const { signToken } = require("../middleware/auth");
const { AppError } = require("../middleware/errorHandler");

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return next(new AppError("username, email and password are required.", "VALIDATION_ERROR", 400));
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

    const token = signToken({ id: userId, username, email });
    res.status(201).json({
      message: "User created!",
      user: { id: userId, username, email },
      token,
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return next(new AppError("Email or username already exists.", "DUPLICATE_USER", 409));
    }
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError("Email and password are required.", "VALIDATION_ERROR", 400));
  }

  try {
    const [rows] = await pool.query(
      "SELECT ID, username, email, password FROM Utilizadores WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      return next(new AppError("Invalid credentials.", "INVALID_CREDENTIALS", 401));
    }

    const u = rows[0];
    const stored = u.password || "";
    const looksHashed = stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$");

    if (!looksHashed) {
      return next(new AppError("Password must be reset. Please contact support.", "PASSWORD_RESET_REQUIRED", 403));
    }

    const ok = await bcrypt.compare(password, stored);

    if (!ok) {
      await appendLog("Utilizadores", "ID", u.ID, "login_failed", { email });
      return next(new AppError("Invalid credentials.", "INVALID_CREDENTIALS", 401));
    }

    await pool.query("UPDATE Utilizadores SET accessed_at = CURRENT_TIMESTAMP WHERE ID = ?", [u.ID]);
    await appendLog("Utilizadores", "ID", u.ID, "login", {});
    consoleLog("auth", "login", { userId: u.ID });

    const token = signToken({ id: u.ID, username: u.username, email: u.email });
    res.json({ user: { id: u.ID, username: u.username, email: u.email }, token });
  } catch (err) {
    next(err);
  }
});

module.exports = router;