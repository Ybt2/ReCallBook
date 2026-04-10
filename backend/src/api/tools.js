const express = require("express");
const router = express.Router();
const { pool } = require("../db/init");
const { getVectorStore } = require("../db/qdrant");
const { generateQuizAction } = require("../services/tools/quizTool");
const { generateFlashcardsAction } = require("../services/tools/flashcardTool");

async function getContextForDoc(docId, query) {
  const vectorStore = await getVectorStore();
  
  // No LangChain + Qdrant, o terceiro argumento É o filtro direto
  const results = await vectorStore.similaritySearch(query, 5, {
    must: [
      {
        key: "metadata.docId", // Voltamos ao metadata.docId se for assim que o Qdrant o guardou
        match: { value: docId }
      }
    ]
  });

  if (results.length === 0) {
    // Se não encontrar com metadata.docId, tenta apenas "docId"
    console.log("Tentando busca sem prefixo metadata...");
    const retryResults = await vectorStore.similaritySearch(query, 5, {
      must: [{ key: "docId", match: { value: docId } }]
    });
    
    if (retryResults.length === 0) throw new Error("Conteúdo não encontrado no Qdrant.");
    return retryResults.map((r) => r.pageContent).join("\n\n");
  }

  return results.map((r) => r.pageContent).join("\n\n");
}

// Helper para salvar na tabela Notebook_assets
async function saveAsset(notebookId, type, data) {
  const query = `
    INSERT INTO Notebook_assets (notebook_ID, asset_type, data) 
    VALUES (?, ?, ?)
  `;
  // Convertemos o objeto JSON para String para o MySQL
  await pool.query(query, [notebookId, type, JSON.stringify(data)]);
}

// POST /api/tools/quiz
router.post("/quiz", async (req, res) => {
  try {
    const { docId, notebookId, numQuestions = 5 } = req.body;
    
    // 1. RAG: Buscar contexto
    const context = await getContextForDoc(docId, "Extract main concepts for a quiz");
    
    // 2. IA: Gerar Quiz
    const quiz = await generateQuizAction(context, numQuestions);
    
    // 3. MySQL: Persistir o asset
    await saveAsset(notebookId, 'quiz', quiz);
    
    res.json({ message: "Quiz gerado e guardado!", data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}); 

// POST /api/tools/flashcards
router.post("/flashcards", async (req, res) => {
  try {
    const { docId, notebookId, numCards = 10 } = req.body;
    
    // 1. RAG: Buscar contexto
    const context = await getContextForDoc(docId, "Key terms for flashcards");
    
    // 2. IA: Gerar Flashcards
    const flashcards = await generateFlashcardsAction(context, numCards);
    
    // 3. MySQL: Persistir o asset
    await saveAsset(notebookId, 'flashcards', flashcards);
    
    res.json({ message: "Flashcards gerados e guardados!", data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;