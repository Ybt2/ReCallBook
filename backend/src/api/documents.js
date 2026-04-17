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
    
    if (!notebookId) {
      return res.status(400).json({ error: "notebookId é obrigatório." });
    }

    const { path: filePath, originalname } = req.file;
    const docId = uuidv4();

    const { chunks } = await parsePDF(filePath, notebookId, docId, originalname);

    await pool.query(
      "INSERT INTO Fontes (ID, notebooks_ID, titulo, tipo, estado) VALUES (?, ?, ?, ?, ?)",
      [docId, notebookId, originalname, 'pdf', 'carregado']
    );

    const vectorStore = await getVectorStore();
    
    await vectorStore.addDocuments(chunks);

    await cleanTempFile(filePath);
    res.json({ id: docId, name: originalname });
  } catch (err) {
    console.error("Erro no upload:", err);
    if (req.file) await cleanTempFile(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;