const { pool } = require("../db/init");
const { getVectorStore } = require("../db/qdrant");
const { parsePDF, cleanTempFile } = require("../utils/pdfParser");

const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid"); 
const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { notebookId } = req.body;
    const { path: filePath, originalname } = req.file;
    const docId = uuidv4();

    const { chunks } = await parsePDF(filePath);

    // 1. MySQL: Metadados
    await pool.query(
      "INSERT INTO Fontes (ID, notebooks_ID, titulo, tipo, estado) VALUES (?, ?, ?, ?, ?)",
      [docId, notebookId, originalname, 'pdf', 'carregado']
    );

    // 2. Qdrant: Vetores via VectorStore abstrato
    const vectorStore = await getVectorStore();
    const documents = chunks.map(text => ({
      pageContent: text,
      metadata: { docId, notebookId }
    }));

    await vectorStore.addDocuments(documents);

    await cleanTempFile(filePath);
    res.json({ id: docId, name: originalname });
  } catch (err) {
    console.error("Erro no upload:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;