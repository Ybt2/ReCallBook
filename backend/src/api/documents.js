const { pool } = require("../db/init");
const { getVectorStore } = require("../db/qdrant");
const { parsePDF } = require("../utils/pdfParser");

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({ dest: path.join(UPLOAD_DIR, "tmp") });

// POST /api/documents/upload
router.post("/upload", upload.single("file"), async (req, res) => {
  let storedPath = null;
  try {
    const { notebookId } = req.body;
    if (!notebookId) return res.status(400).json({ error: "notebookId é obrigatório." });
    if (!req.file) return res.status(400).json({ error: "Ficheiro em falta." });

    const { path: tmpPath, originalname } = req.file;
    const docId = uuidv4();

    // Persist the file permanently so it can be viewed later
    storedPath = path.join(UPLOAD_DIR, `${docId}.pdf`);
    fs.renameSync(tmpPath, storedPath);

    const { chunks, summary } = await parsePDF(storedPath, notebookId, docId, originalname);

    await pool.query(
      "INSERT INTO Fontes (ID, notebooks_ID, titulo, tipo, estado) VALUES (?, ?, ?, ?, ?)",
      [docId, notebookId, originalname, "pdf", "processado"]
    );

    const vectorStore = await getVectorStore();
    await vectorStore.addDocuments(chunks);

    res.json({ id: docId, name: originalname, pages: summary.totalPages, chunks: summary.totalChunks });
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

// GET /api/documents/:id/file  -> serve PDF
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
    await pool.query("DELETE FROM Fontes WHERE ID = ?", [docId]);

    // Also try to drop vectors for this doc
    try {
      const { client, COLLECTION_NAME } = require("../db/qdrant");
      await client.delete(COLLECTION_NAME, {
        filter: { must: [{ key: "metadata.docId", match: { value: docId } }] },
      });
    } catch (e) {
      console.warn("Qdrant delete warning:", e.message);
    }

    const filePath = path.join(UPLOAD_DIR, `${docId}.pdf`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ message: "Documento eliminado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
