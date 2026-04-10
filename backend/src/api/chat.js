const express = require("express");
const router = express.Router();
const { pool } = require("../db/init"); // Teu pool de MySQL
const { chatWithAi } = require("../services/chatService");

router.post("/pergunta", async (req, res) => {
  const startTime = Date.now();
  const { notebookId, mensagem } = req.body;

  try {
    // 1. Buscar histórico recente (últimas 6 mensagens)
    const [rows] = await pool.query(
      "SELECT role, conteudo FROM Mensagens WHERE notebooks_ID = ? ORDER BY created_at DESC LIMIT 6",
      [notebookId]
    );
    
    const history = rows
      .reverse()
      .map(m => `${m.role === 'utilizador' ? 'User' : 'Assistant'}: ${m.conteudo}`)
      .join("\n");

    // 2. Chamar IA
    const aiResponse = await chatWithAi(notebookId, mensagem, history);
    const tempoProc = ((Date.now() - startTime) / 1000).toFixed(2);

    // Extraímos os tokens que calculámos no serviço
    const totalTokens = aiResponse.usage.totalTokens;

    // 3. Guardar Mensagem do Utilizador
    await pool.query(
      "INSERT INTO Mensagens (notebooks_ID, role, conteudo) VALUES (?, 'utilizador', ?)",
      [notebookId, mensagem]
    );

    // 4. Guardar Resposta da IA (Conteúdo Estruturado)
    const [result] = await pool.query(
      `INSERT INTO Mensagens 
      (notebooks_ID, role, conteudo, modelo_ai, LOGS, tempo_processamento, num_tokens) 
      VALUES (?, 'assistant', ?, ?, ?, ?, ?)`,
      [
        notebookId,
        JSON.stringify({ 
          texto_final: aiResponse.texto_final, 
          fontes: aiResponse.fontes 
        }), 
        "llama3.2:3b",
        "SUCCESS",
        tempoProc,
        totalTokens // <--- Agora preenchemos a coluna!
      ]
    );

    res.json({ id: result.insertId, ...aiResponse });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao processar o chat." });
  }
});

module.exports = router;