const express = require("express");
const router = express.Router();
const { pool } = require("../db/init");
const { getVectorStore } = require("../db/qdrant");
const { generateQuizAction } = require("../services/tools/quizTool");
const { generateFlashcardsAction } = require("../services/tools/flashcardTool");
const { appendLog, consoleLog } = require("../utils/logger");
const { buildNotebookFilter } = require("../utils/validation");
const { AppError } = require("../middleware/errorHandler");
const { requireNotebookOwner, requireAssetOwner } = require("../middleware/ownership");

async function getContext(notebookId, docIds, query) {
  const vectorStore = await getVectorStore();
  const filter = buildNotebookFilter(notebookId, docIds);

  const results = await vectorStore.similaritySearch(query, 8, filter);
  if (results.length === 0) throw new AppError("No content found to generate the resource.", "NO_CONTENT", 404);
  return results.map((r) => r.pageContent).join("\n\n");
}

async function saveAsset(notebookId, type, data, meta = {}) {
  const payload = { ...data, _meta: meta };
  const [result] = await pool.query(
    "INSERT INTO Notebook_assets (notebook_ID, asset_type, data) VALUES (?, ?, ?)",
    [notebookId, type, JSON.stringify(payload)]
  );
  return result.insertId;
}

// GET /api/tools?notebookId=
router.get("/", async (req, res, next) => {
  const { notebookId } = req.query;
  if (!notebookId) return next(new AppError("notebookId is required.", "VALIDATION_ERROR", 400));

  const [nbRows] = await pool.query("SELECT utilizadores_ID FROM NoteBooks WHERE ID = ? LIMIT 1", [notebookId]);
  if (nbRows.length === 0) return next(new AppError("Notebook not found.", "NOT_FOUND", 404));
  if (nbRows[0].utilizadores_ID !== req.user.id) return next(new AppError("Access denied.", "FORBIDDEN", 403));

  try {
    const [rows] = await pool.query(
      `SELECT ID as id, asset_type as type, data, created_at
       FROM Notebook_assets WHERE notebook_ID = ? ORDER BY created_at DESC`,
      [notebookId]
    );
    const assets = rows.map((r) => {
      const data = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
      return {
        id: r.id,
        type: r.type,
        title: data?._meta?.title || data?.title || (r.type === "quiz" ? "Quiz" : "Flashcards"),
        created_at: r.created_at,
      };
    });
    res.json(assets);
  } catch (err) {
    next(err);
  }
});

// GET /api/tools/:id
router.get("/:id", requireAssetOwner, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT ID as id, asset_type as type, data, created_at FROM Notebook_assets WHERE ID = ? LIMIT 1",
      [req.params.id]
    );
    if (rows.length === 0) return next(new AppError("Resource not found.", "NOT_FOUND", 404));
    const r = rows[0];
    const data = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
    res.json({ id: r.id, type: r.type, data, created_at: r.created_at });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tools/:id
router.delete("/:id", requireAssetOwner, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT notebook_ID FROM Notebook_assets WHERE ID = ?",
      [req.params.id]
    );
    await pool.query("DELETE FROM Notebook_assets WHERE ID = ?", [req.params.id]);
    if (rows[0]) {
      await appendLog("NoteBooks", "ID", rows[0].notebook_ID, "asset_deleted", {
        assetId: req.params.id,
      });
    }
    res.json({ message: "Resource deleted." });
  } catch (err) {
    next(err);
  }
});

// POST /api/tools/quiz
router.post("/quiz", async (req, res, next) => {
  try {
    const { notebookId, docIds, prompt, numQuestions = 5, difficulty = "medium" } = req.body;

    const [nbRows] = await pool.query("SELECT utilizadores_ID FROM NoteBooks WHERE ID = ? LIMIT 1", [notebookId]);
    if (nbRows.length === 0) return next(new AppError("Notebook not found.", "NOT_FOUND", 404));
    if (nbRows[0].utilizadores_ID !== req.user.id) return next(new AppError("Access denied.", "FORBIDDEN", 403));

    const query = prompt?.trim() || "Extract main concepts for a quiz";

    const context = await getContext(notebookId, docIds, query);
    const quiz = await generateQuizAction(context, numQuestions, difficulty, prompt);

    const title = prompt?.trim() ? `Quiz: ${prompt.slice(0, 40)}` : `Quiz (${numQuestions} questions)`;
    const id = await saveAsset(notebookId, "quiz", quiz, { title, prompt, numQuestions, difficulty });

    await appendLog("NoteBooks", "ID", notebookId, "quiz_generated", {
      assetId: id,
      numQuestions,
      difficulty,
    });
    consoleLog("tools", "quiz generated", { notebookId, numQuestions, difficulty });

    res.json({ message: "Quiz generated!", id, data: quiz });
  } catch (err) {
    next(err);
  }
});

// POST /api/tools/flashcards
router.post("/flashcards", async (req, res, next) => {
  try {
    const { notebookId, docIds, prompt, numCards = 10, difficulty = "medium" } = req.body;

    const [nbRows] = await pool.query("SELECT utilizadores_ID FROM NoteBooks WHERE ID = ? LIMIT 1", [notebookId]);
    if (nbRows.length === 0) return next(new AppError("Notebook not found.", "NOT_FOUND", 404));
    if (nbRows[0].utilizadores_ID !== req.user.id) return next(new AppError("Access denied.", "FORBIDDEN", 403));

    const query = prompt?.trim() || "Key terms for flashcards";

    const context = await getContext(notebookId, docIds, query);
    const flashcards = await generateFlashcardsAction(context, numCards, difficulty, prompt);

    const title = prompt?.trim() ? `Flashcards: ${prompt.slice(0, 40)}` : `Flashcards (${numCards})`;
    const id = await saveAsset(notebookId, "flashcards", flashcards, { title, prompt, numCards, difficulty });

    await appendLog("NoteBooks", "ID", notebookId, "flashcards_generated", {
      assetId: id,
      numCards,
      difficulty,
    });
    consoleLog("tools", "flashcards generated", { notebookId, numCards, difficulty });

    res.json({ message: "Flashcards generated!", id, data: flashcards });
  } catch (err) {
    next(err);
  }
});

module.exports = router;