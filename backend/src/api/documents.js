const { pool } = require("../db/init");
const { getVectorStore, client: qdrantClient, COLLECTION_NAME } = require("../db/qdrant");
const { parsePDF } = require("../utils/readers/pdfParser");
const { parseText } = require("../utils/readers/textParser");
const { parseImage, isImageFile, getImageType } = require("../services/vision");
const { appendLog, consoleLog } = require("../utils/logger");
const { AppError } = require("../middleware/errorHandler");
const { requireNotebookOwner, requireDocumentOwner } = require("../middleware/ownership");
const { uploadSchema, validate } = require("../utils/validationSchemas");

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

// Clean stale temp files on startup
try {
  const tmpFiles = fs.readdirSync(TMP_DIR);
  for (const f of tmpFiles) {
    const fp = path.join(TMP_DIR, f);
    try { fs.unlinkSync(fp); } catch (_) {}
  }
} catch (_) {}

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
]);

const ALLOWED_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png", ".svg", ".md", ".txt"]);

const upload = multer({
  dest: TMP_DIR,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new AppError(`File extension '${ext}' is not allowed.`, "INVALID_FILE_TYPE", 400));
    }
    const isTextExt = ext === ".md" || ext === ".txt";
    if (!isTextExt && !ALLOWED_MIMES.has(file.mimetype)) {
      return cb(new AppError(`MIME type '${file.mimetype}' is not allowed.`, "INVALID_MIME_TYPE", 400));
    }
    cb(null, true);
  },
});

function sanitizeFilename(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._\-\s()]/g, "_").slice(0, 255);
}

const MIME_MAP = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".md": "text/markdown",
  ".txt": "text/plain",
};

// POST /api/documents/upload
router.post("/upload", upload.single("file"), validate(uploadSchema), async (req, res, next) => {
  let storedPath = null;
  try {
    const { notebookId } = req.body;
    if (!notebookId) return next(new AppError("notebookId is required.", "VALIDATION_ERROR", 400));
    if (!req.file) return next(new AppError("File is missing.", "VALIDATION_ERROR", 400));

    const [nbRows] = await pool.query("SELECT utilizadores_ID FROM NoteBooks WHERE ID = ? LIMIT 1", [notebookId]);
    if (nbRows.length === 0) return next(new AppError("Notebook not found.", "NOT_FOUND", 404));
    if (nbRows[0].utilizadores_ID !== req.user.id) return next(new AppError("Access denied.", "FORBIDDEN", 403));

    const { path: tmpPath, originalname } = req.file;
    const { visionModel } = req.body;
    const safeName = sanitizeFilename(originalname);
    const docId = uuidv4();
    const ext = path.extname(safeName).toLowerCase();
    const isImage = isImageFile(safeName);
    const isText = ext === ".md" || ext === ".txt";
    const fileType = isImage ? getImageType(safeName) : isText ? ext.slice(1) : "pdf";

    storedPath = path.join(UPLOAD_DIR, `${docId}${ext}`);
    fs.copyFileSync(tmpPath, storedPath);
    fs.unlinkSync(tmpPath);

    let chunks, summary;
    if (isImage) {
      if (!visionModel) {
        const [uRow] = await pool.query("SELECT vision_model FROM Utilizadores WHERE ID = ? LIMIT 1", [req.user.id]);
        const userVisionModel = uRow[0]?.vision_model || null;
        if (userVisionModel) {
          ({ chunks, summary } = await parseImage(storedPath, notebookId, docId, safeName, userVisionModel));
        } else {
          const rawText = `[Image: ${safeName} — No vision model configured. Image stored without description.]`;
          const { Document } = require("@langchain/core/documents");
          chunks = [new Document({ pageContent: rawText, metadata: { notebookId: String(notebookId), docId, source_type: getImageType(safeName), source_name: safeName, source_ref: "Imagem", chunk_index: 0 } })];
          summary = { totalPages: 1, totalChunks: 1, fileName: safeName, avgChunkSize: rawText.length };
        }
      } else {
        ({ chunks, summary } = await parseImage(storedPath, notebookId, docId, safeName, visionModel));
      }
    } else if (isText) {
      ({ chunks, summary } = await parseText(storedPath, notebookId, docId, safeName));
    } else {
      ({ chunks, summary } = await parsePDF(storedPath, notebookId, docId, safeName));
    }

    await pool.query(
      "INSERT INTO Fontes (ID, notebooks_ID, titulo, tipo, estado) VALUES (?, ?, ?, ?, ?)",
      [docId, notebookId, safeName, fileType, "processado"]
    );

    const vectorStore = await getVectorStore();
    await vectorStore.addDocuments(chunks);

    await appendLog("Fontes", "ID", docId, "uploaded", {
      pages: summary.totalPages,
      chunks: summary.totalChunks,
    });
    await appendLog("NoteBooks", "ID", notebookId, "file_uploaded", {
      docId,
      name: safeName,
    });
    consoleLog("documents", "uploaded", { docId, name: safeName, chunks: summary.totalChunks });

    res.json({
      id: docId,
      name: safeName,
      type: fileType,
      pages: summary.totalPages,
      chunks: summary.totalChunks,
    });
  } catch (err) {
    if (storedPath && fs.existsSync(storedPath)) {
      try { fs.unlinkSync(storedPath); } catch (_) {}
    }
    next(err);
  }
});

// GET /api/documents?notebookId=
router.get("/", async (req, res, next) => {
  const { notebookId, page, limit } = req.query;
  if (!notebookId) return next(new AppError("notebookId is required.", "VALIDATION_ERROR", 400));

  const [nbRows] = await pool.query("SELECT utilizadores_ID FROM NoteBooks WHERE ID = ? LIMIT 1", [notebookId]);
  if (nbRows.length === 0) return next(new AppError("Notebook not found.", "NOT_FOUND", 404));
  if (nbRows[0].utilizadores_ID !== req.user.id) return next(new AppError("Access denied.", "FORBIDDEN", 403));

  try {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * pageSize;

    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) as total FROM Fontes WHERE notebooks_ID = ?",
      [notebookId]
    );
    const [rows] = await pool.query(
      `SELECT ID as id, titulo as name, tipo as type, estado as status, created_at
       FROM Fontes WHERE notebooks_ID = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [notebookId, pageSize, offset]
    );
    res.json({ data: rows, pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id/file
router.get("/:id/file", requireDocumentOwner, async (req, res, next) => {
  const docId = req.params.id;
  if (!/^[a-f0-9\-]{36}$/i.test(docId)) return next(new AppError("Invalid document ID.", "VALIDATION_ERROR", 400));

  const extensions = [".pdf", ".jpg", ".jpeg", ".png", ".svg", ".md", ".txt"];
  let filePath = null;
  for (const ext of extensions) {
    const candidate = path.join(UPLOAD_DIR, `${docId}${ext}`);
    if (fs.existsSync(candidate)) {
      filePath = candidate;
      break;
    }
  }
  if (!filePath) return next(new AppError("File not found.", "NOT_FOUND", 404));
  const ext = path.extname(filePath).toLowerCase();
  res.setHeader("Content-Type", MIME_MAP[ext] || "application/octet-stream");
  res.setHeader("Content-Disposition", "inline");
  fs.createReadStream(filePath).pipe(res);
});

// DELETE /api/documents/:id
router.delete("/:id", requireDocumentOwner, async (req, res, next) => {
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

    const extensions = [".pdf", ".jpg", ".jpeg", ".png", ".svg", ".md", ".txt"];
    for (const ext of extensions) {
      const filePath = path.join(UPLOAD_DIR, `${docId}${ext}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        break;
      }
    }

    if (parentNotebook) {
      await appendLog("NoteBooks", "ID", parentNotebook, "file_deleted", { docId, name });
    }
    consoleLog("documents", "deleted", { docId });

    res.json({ message: "Document deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
