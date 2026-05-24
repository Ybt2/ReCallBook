const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { pool } = require("../db/init");
const { appendLog, consoleLog } = require("../utils/logger");
const { signToken, requireAuth } = require("../middleware/auth");
const { AppError } = require("../middleware/errorHandler");
const { registerSchema, loginSchema, validate } = require("../utils/validationSchemas");

// Keep in sync with frontend src/stores/auth.js SUPPORTED_LANGUAGES
const SUPPORTED_LANGUAGES = ["English", "Portuguese"];

// POST /api/auth/register
router.post("/register", validate(registerSchema), async (req, res, next) => {
  const { username, email, password, language = "English" } = req.body;

  const lang = SUPPORTED_LANGUAGES.includes(language) ? language : "English";

  try {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO Utilizadores (username, email, password, language) VALUES (?, ?, ?, ?)",
      [username, email, hashed, lang]
    );

    const userId = result.insertId;
    await appendLog("Utilizadores", "ID", userId, "register", { username, email });
    consoleLog("auth", "register", { userId, username });

    const token = signToken({ id: userId, username, email });
    res.status(201).json({
      message: "User created!",
      user: { id: userId, username, email, language: lang },
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
router.post("/login", validate(loginSchema), async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT ID, username, email, password, language FROM Utilizadores WHERE email = ? LIMIT 1",
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
    res.json({ user: { id: u.ID, username: u.username, email: u.email, language: u.language || "English" }, token });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/profile
router.put("/profile", requireAuth, async (req, res, next) => {
  const { language } = req.body;
  if (!language || !SUPPORTED_LANGUAGES.includes(language)) {
    return next(new AppError("Invalid language.", "VALIDATION_ERROR", 400));
  }
  try {
    await pool.query("UPDATE Utilizadores SET language = ? WHERE ID = ?", [language, req.user.id]);
    res.json({ message: "Profile updated.", language });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/password
router.put("/password", requireAuth, async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return next(new AppError("currentPassword and newPassword are required.", "VALIDATION_ERROR", 400));
  }
  if (newPassword.length < 4) {
    return next(new AppError("New password must be at least 4 characters.", "VALIDATION_ERROR", 400));
  }

  try {
    const [rows] = await pool.query(
      "SELECT password FROM Utilizadores WHERE ID = ? LIMIT 1",
      [req.user.id]
    );
    if (rows.length === 0) {
      return next(new AppError("User not found.", "NOT_FOUND", 404));
    }

    const stored = rows[0].password || "";
    const ok = await bcrypt.compare(currentPassword, stored);
    if (!ok) {
      return next(new AppError("Current password is incorrect.", "INVALID_CREDENTIALS", 401));
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE Utilizadores SET password = ? WHERE ID = ?", [hashed, req.user.id]);
    res.json({ message: "Password updated." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;