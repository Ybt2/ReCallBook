const express = require("express");
const cors = require("cors");
require('dotenv').config();
const { initCross_encoder } = require('./services/cross_encoder.js');

const { initDB } = require("./db/init");
const { initQdrant } = require("./db/qdrant");
const { requireAuth } = require("./middleware/auth");
const { errorHandler } = require("./middleware/errorHandler");

const authRouter = require("./api/auth");
const notebooksRouter = require("./api/notebooks");
const documentsRouter = require("./api/documents");
const toolsRouter = require("./api/tools");
const chatRouter = require("./api/chat");
const ollamaRouter = require("./api/ollama");

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:5173").split(",").map(s => s.trim());
app.use(cors({
  origin(origin, cb) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use("/api/auth", authRouter);
app.use("/api/notebooks", requireAuth, notebooksRouter);
app.use("/api/documents", requireAuth, documentsRouter);
app.use("/api/tools", requireAuth, toolsRouter);
app.use("/api/chat", requireAuth, chatRouter);
app.use("/api/ollama", requireAuth, ollamaRouter);

app.use(errorHandler);

module.exports = app;

const PORT = process.env.PORT || 3000;

// Função de Inicialização Assíncrona
async function startServer() {
  try {
    console.log("Starting ReCallBook Services...");

    // 1. Inicializar MySQL (Criar DB e Tabelas)
    await initDB();
    console.log("MySQL Ready");

    // 2. Inicializar Qdrant (Verificar Coleções)
    await initQdrant();
    console.log("Qdrant Ready");

    console.log("A pré-carregar modelo de reranking...");
    await initCross_encoder();

    // 3. Iniciar o Express
    app.listen(PORT, () => {
      console.log(`ReCallBook backend running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1); // Fecha o processo se as DBs falharem
  }
}

if (require.main === module) {
  startServer();
}