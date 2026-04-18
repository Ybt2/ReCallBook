const { pool } = require("../db/init");
const { getVectorStore, client: qdrantClient, COLLECTION_NAME } = require("../db/qdrant");
const { parsePDF } = require("../utils/pdfParser");
const { appendLog, consoleLog } = require("../utils/logger");

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const TMP_DIR = path.join(UPLOAD_DIR, "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const upload = multer({ dest: TMP_DIR });

// POST /api/documents/upload
router.post("/upload", upload.single("file"), async (req, res) => {
  let storedPath = null;
  try {
    const { notebookId } = req.body;
    if (!notebookId) return res.status(400).json({ error: "notebookId é obrigatório." });
    if (!req.file) return res.status(400).json({ error: "Ficheiro em falta." });

    const { path: tmpPath, originalname } = req.file;
    const docId = uuidv4();

    storedPath = path.join(UPLOAD_DIR, `${docId}.pdf`);
    fs.renameSync(tmpPath, storedPath);

    const { chunks, summary } = await parsePDF(storedPath, notebookId, docId, originalname);

    await pool.query(
      "INSERT INTO Fontes (ID, notebooks_ID, titulo, tipo, estado) VALUES (?, ?, ?, ?, ?)",
      [docId, notebookId, originalname, "pdf", "processado"]
    );

    const vectorStore = await getVectorStore();
    await vectorStore.addDocuments(chunks);

    await appendLog("Fontes", "ID", docId, "uploaded", {
      pages: summary.totalPages,
      chunks: summary.totalChunks,
    });
    await appendLog("NoteBooks", "ID", notebookId, "file_uploaded", {
      docId,
      name: originalname,
    });
    consoleLog("documents", "uploaded", { docId, name: originalname, chunks: summary.totalChunks });

    res.json({
      id: docId,
      name: originalname,
      pages: summary.totalPages,
      chunks: summary.totalChunks,
    });
  } catch (err) {
    console.error("Erro no upload:", err);
    if (storedPath && fs.existsSync(storedPath)) {
      try { fs.unlinkSync(storedPath); } catch (_) {}
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents?notebookId=
router.get("/", async (req, res) => {
  const { notebookId } = req.query;
  if (!notebookId) return res.status(400).json({ error: "notebookId é obrigatório." });

  try {
    const [rows] = await pool.query(
      `SELECT ID as id, titulo as name, tipo as type, estado as status, created_at
       FROM Fontes WHERE notebooks_ID = ? ORDER BY created_at DESC`,
      [notebookId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/:id/file
router.get("/:id/file", async (req, res) => {
  const filePath = path.join(UPLOAD_DIR, `${req.params.id}.pdf`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Ficheiro não encontrado." });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline");
  fs.createReadStream(filePath).pipe(res);
});

// DELETE /api/documents/:id
router.delete("/:id", async (req, res) => {
  try {
    const docId = req.params.id;

    const [rows] = await pool.query(
      "SELECT notebooks_ID, titulo FROM Fontes WHERE ID = ? LIMIT 1",
      [docId]
    );
    const parentNotebook = rows[0]?.notebooks_ID;
    const name = rows[0]?.titulo;

    await pool.query("DELETE FROM Fontes WHERE ID = ?", [docId]);

    try {
      await qdrantClient.delete(COLLECTION_NAME, {
        filter: { must: [{ key: "metadata.docId", match: { value: docId } }] },
      });
    } catch (e) {
      console.warn("Qdrant delete warning:", e.message);
    }

    const filePath = path.join(UPLOAD_DIR, `${docId}.pdf`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    if (parentNotebook) {
      await appendLog("NoteBooks", "ID", parentNotebook, "file_deleted", { docId, name });
    }
    consoleLog("documents", "deleted", { docId });

    res.json({ message: "Documento eliminado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
