const express = require("express");
const router = express.Router();
const { pool } = require("../db/init");
const { getVectorStore } = require("../db/qdrant");
const { generateQuizAction } = require("../services/tools/quizTool");
const { generateFlashcardsAction } = require("../services/tools/flashcardTool");

async function getContextForDoc(docId, query) {
  const vectorStore = await getVectorStore();
  
  const results = await vectorStore.similaritySearch(query, 5, {
    must: [
      {
        key: "metadata.docId", 
        match: { value: docId }
      }
    ]
  });

  if (results.length === 0) {
    console.log("A tentar busca sem prefixo metadata...");
    const retryResults = await vectorStore.similaritySearch(query, 5, {
      must: [{ key: "docId", match: { value: docId } }]
    });
    
    if (retryResults.length === 0) throw new Error("Conteúdo não encontrado no Qdrant.");
    return retryResults.map((r) => r.pageContent).join("\n\n");
  }

  return results.map((r) => r.pageContent).join("\n\n");
}

async function saveAsset(notebookId, type, data) {
  const query = `
    INSERT INTO Notebook_assets (notebook_ID, asset_type, data) 
    VALUES (?, ?, ?)
  `;
  await pool.query(query, [notebookId, type, JSON.stringify(data)]);
}

router.post("/quiz", async (req, res) => {
  try {
    const { docId, notebookId, numQuestions = 5 } = req.body;
    
  
    const context = await getContextForDoc(docId, "Extract main concepts for a quiz");
    
    const quiz = await generateQuizAction(context, numQuestions);
    
    await saveAsset(notebookId, 'quiz', quiz);
    
    res.json({ message: "Quiz gerado e guardado!", data: quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}); 

router.post("/flashcards", async (req, res) => {
  try {
    const { docId, notebookId, numCards = 10 } = req.body;
    
    const context = await getContextForDoc(docId, "Key terms for flashcards");
    
    const flashcards = await generateFlashcardsAction(context, numCards);
    
    await saveAsset(notebookId, 'flashcards', flashcards);
    
    res.json({ message: "Flashcards gerados e guardados!", data: flashcards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;