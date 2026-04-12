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
    
    // Verificação de segurança: se o notebookId não vier, o MySQL vai dar erro
    if (!notebookId) {
      return res.status(400).json({ error: "notebookId é obrigatório." });
    }

    const { path: filePath, originalname } = req.file;
    const docId = uuidv4();

    // 1. Chamar o parser com os IDs necessários para os metadados
    // Agora o 'chunks' já vem como um array de instâncias 'Document' (do LangChain)
    const { chunks } = await parsePDF(filePath, notebookId, docId, originalname);

    // 2. MySQL: Guardar o registo da fonte
    await pool.query(
      "INSERT INTO Fontes (ID, notebooks_ID, titulo, tipo, estado) VALUES (?, ?, ?, ?, ?)",
      [docId, notebookId, originalname, 'pdf', 'carregado']
    );

    // 3. Qdrant: Enviar os documentos diretamente
    const vectorStore = await getVectorStore();
    
    // REMOVIDO: O map manual que tinhas aqui. 
    // O 'chunks' já está no formato correto vindo do parsePDF.
    await vectorStore.addDocuments(chunks);

    await cleanTempFile(filePath);
    res.json({ id: docId, name: originalname });
  } catch (err) {
    console.error("Erro no upload:", err);
    // Limpar o ficheiro mesmo se der erro para não entupir o disco
    if (req.file) await cleanTempFile(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;