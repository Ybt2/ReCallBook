const express = require("express");
const router = express.Router();
const { pool } = require("../db/init");

router.get("/models", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT general_model, query_model, vision_model FROM Utilizadores WHERE ID = ? LIMIT 1",
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found." });
    res.json({
      general_model: rows[0].general_model || null,
      query_model: rows[0].query_model || null,
      vision_model: rows[0].vision_model || null,
    });
  } catch (err) {
    next(err);
  }
});

router.put("/models", async (req, res, next) => {
  try {
    const { general_model, query_model, vision_model } = req.body;
    await pool.query(
      "UPDATE Utilizadores SET general_model = ?, query_model = ?, vision_model = ? WHERE ID = ?",
      [general_model || null, query_model || null, vision_model || null, req.user.id]
    );
    res.json({ message: "Models updated." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
