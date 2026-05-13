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

async function getContextFromPrompt(notebookId, docIds, query) {
  const vectorStore = await getVectorStore();
  const filter = buildNotebookFilter(notebookId, docIds);
  const results = await vectorStore.similaritySearch(query, 10, filter);
  if (results.length === 0) throw new AppError("No content found to generate the resource.", "NO_CONTENT", 404);
  return results.map((r) => r.pageContent).join("\n\n");
}

async function getRandomContext(notebookId, docIds) {
  const vectorStore = await getVectorStore();
  const filter = buildNotebookFilter(notebookId, docIds);
  const diverseQueries = [
    "main concepts definitions key terms",
    "examples procedures steps processes",
    "facts dates events results conclusions",
    "theories principles rules formulas",
  ];
  const seen = new Set();
  const chunks = [];
  for (const q of diverseQueries) {
    try {
      const results = await vectorStore.similaritySearch(q, 5, filter);
      for (const r of results) {
        const key = r.pageContent.slice(0, 80);
        if (!seen.has(key)) {
          seen.add(key);
          chunks.push(r.pageContent);
        }
      }
    } catch (_) {}
  }
  if (chunks.length === 0) throw new AppError("No content found to generate the resource.", "NO_CONTENT", 404);
  const shuffled = chunks.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 15).join("\n\n");
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
        title: data?._meta?.title || data?.title || (r.type === "quiz" ? "Quiz" : r.type === "note" ? "Note" : "Flashcards"),
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

// PATCH /api/tools/:id/results — save (overwrite) the last attempt result
router.patch("/:id/results", requireAssetOwner, async (req, res, next) => {
  try {
    const { result } = req.body;
    if (!result || typeof result !== "object") {
      return next(new AppError("result object is required.", "VALIDATION_ERROR", 400));
    }
    const [rows] = await pool.query(
      "SELECT data FROM Notebook_assets WHERE ID = ? LIMIT 1",
      [req.params.id]
    );
    if (rows.length === 0) return next(new AppError("Resource not found.", "NOT_FOUND", 404));
    const data = typeof rows[0].data === "string" ? JSON.parse(rows[0].data) : rows[0].data;
    // Store only the last result — overwrite any previous one
    data._result = { ...result, _at: new Date().toISOString() };
    await pool.query("UPDATE Notebook_assets SET data = ? WHERE ID = ?", [
      JSON.stringify(data),
      req.params.id,
    ]);
    res.json({ message: "Result saved.", result: data._result });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tools/:id — rename
router.patch("/:id", requireAssetOwner, async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title?.trim()) return next(new AppError("title is required.", "VALIDATION_ERROR", 400));
    const [rows] = await pool.query(
      "SELECT data FROM Notebook_assets WHERE ID = ? LIMIT 1",
      [req.params.id]
    );
    if (rows.length === 0) return next(new AppError("Resource not found.", "NOT_FOUND", 404));
    const data = typeof rows[0].data === "string" ? JSON.parse(rows[0].data) : rows[0].data;
    data._meta = { ...(data._meta || {}), title: title.trim() };
    await pool.query("UPDATE Notebook_assets SET data = ? WHERE ID = ?", [
      JSON.stringify(data),
      req.params.id,
    ]);
    res.json({ message: "Renamed." });
  } catch (err) {
    next(err);
  }
});

// POST /api/tools/quiz
router.post("/quiz", async (req, res, next) => {
  try {
    const { notebookId, docIds, prompt, numQuestions = 5, difficulty = "medium", model } = req.body;

    const [nbRows] = await pool.query("SELECT utilizadores_ID FROM NoteBooks WHERE ID = ? LIMIT 1", [notebookId]);
    if (nbRows.length === 0) return next(new AppError("Notebook not found.", "NOT_FOUND", 404));
    if (nbRows[0].utilizadores_ID !== req.user.id) return next(new AppError("Access denied.", "FORBIDDEN", 403));

    const [[uRow]] = await pool.query("SELECT language FROM Utilizadores WHERE ID = ? LIMIT 1", [req.user.id]);
    const userLanguage = uRow?.language || "English";

    const context = prompt?.trim()
      ? await getContextFromPrompt(notebookId, docIds, prompt.trim())
      : await getRandomContext(notebookId, docIds);

    const quiz = await generateQuizAction(context, numQuestions, difficulty, prompt, model || undefined, userLanguage);

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
    const { notebookId, docIds, prompt, numCards = 10, difficulty = "medium", model } = req.body;

    const [nbRows] = await pool.query("SELECT utilizadores_ID FROM NoteBooks WHERE ID = ? LIMIT 1", [notebookId]);
    if (nbRows.length === 0) return next(new AppError("Notebook not found.", "NOT_FOUND", 404));
    if (nbRows[0].utilizadores_ID !== req.user.id) return next(new AppError("Access denied.", "FORBIDDEN", 403));

    const [[uRow]] = await pool.query("SELECT language FROM Utilizadores WHERE ID = ? LIMIT 1", [req.user.id]);
    const userLanguage = uRow?.language || "English";

    const context = prompt?.trim()
      ? await getContextFromPrompt(notebookId, docIds, prompt.trim())
      : await getRandomContext(notebookId, docIds);

    const flashcards = await generateFlashcardsAction(context, numCards, difficulty, prompt, model || undefined, userLanguage);

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

// POST /api/tools/note
router.post("/note", async (req, res, next) => {
  try {
    const { notebookId, content, title } = req.body;
    if (!notebookId) return next(new AppError("notebookId is required.", "VALIDATION_ERROR", 400));
    if (!content) return next(new AppError("content is required.", "VALIDATION_ERROR", 400));

    const [nbRows] = await pool.query("SELECT utilizadores_ID FROM NoteBooks WHERE ID = ? LIMIT 1", [notebookId]);
    if (nbRows.length === 0) return next(new AppError("Notebook not found.", "NOT_FOUND", 404));
    if (nbRows[0].utilizadores_ID !== req.user.id) return next(new AppError("Access denied.", "FORBIDDEN", 403));

    const noteTitle = title || content.slice(0, 60).replace(/\n/g, " ") + (content.length > 60 ? "…" : "");
    const id = await saveAsset(notebookId, "note", { content }, { title: noteTitle });

    await appendLog("NoteBooks", "ID", notebookId, "note_pinned", { assetId: id });
    consoleLog("tools", "note pinned", { notebookId });

    res.json({ message: "Note pinned!", id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;