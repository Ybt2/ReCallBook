const express = require("express");
const cors = require("cors");
require('dotenv').config(); // Garante que as variáveis de ambiente são carregadas

const { initDB } = require("./db/init");
const { initQdrant } = require("./db/qdrant");

const authRouter = require("./api/auth");
const notebooksRouter = require("./api/notebooks");
const documentsRouter = require("./api/documents");
const toolsRouter = require("./api/tools");
const chatRouter = require("./api/chat");

const app = express();
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use("/api/auth", authRouter);
app.use("/api/notebooks", notebooksRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/tools", toolsRouter);
app.use("/api/chat", chatRouter);

const PORT = process.env.PORT || 3000;

// Função de Inicialização Assíncrona
async function startServer() {
  try {
    console.log("Starting ReCallBook Services...");

    // 1. Inicializar MySQL (Criar DB e Tabelas)
    await initDB();
    console.log("✅ MySQL Ready");

    // 2. Inicializar Qdrant (Verificar Coleções)
    await initQdrant();
    console.log("✅ Qdrant Ready");

    // 3. Iniciar o Express
    app.listen(PORT, () => {
      console.log(`🚀 ReCallBook backend running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1); // Fecha o processo se as DBs falharem
  }
}

startServer();