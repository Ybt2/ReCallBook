process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason?.message || reason);
});

process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error.message);
});

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { initDB } = require("./db/init");
const { initQdrant } = require("./db/qdrant");
const { initCross_encoder } = require("./services/cross_encoder");
const { requireAuth } = require("./middleware/auth");
const { errorHandler } = require("./middleware/errorHandler");
const { apiLimiter, authLimiter } = require("./middleware/rateLimiter");

const authRouter = require("./api/auth");
const notebooksRouter = require("./api/notebooks");
const documentsRouter = require("./api/documents");
const toolsRouter = require("./api/tools");
const chatRouter = require("./api/chat");
const ollamaRouter = require("./api/ollama");
const healthRouter = require("./api/health");
const userRouter = require("./api/user");

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:5173").split(",").map(s => s.trim());
const IS_PRODUCTION = process.env.NODE_ENV === "production";
app.use(cors({
  origin(origin, cb) {
    if (!origin) {
      if (IS_PRODUCTION) return cb(new Error("Not allowed by CORS"));
      return cb(null, true);
    }
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(apiLimiter);

app.use("/api/health", healthRouter);
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/notebooks", requireAuth, notebooksRouter);
app.use("/api/documents", requireAuth, documentsRouter);
app.use("/api/tools", requireAuth, toolsRouter);
app.use("/api/chat", requireAuth, chatRouter);
app.use("/api/ollama", requireAuth, ollamaRouter);
app.use("/api/user", requireAuth, userRouter);

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

    // 3. Inicializar Cross-Encoder (descarregar modelo da HuggingFace)
    console.log("Cross-encoder starting download (this may take a while on first run)...");
    await initCross_encoder();
    console.log("Cross-encoder Ready");

    // 4. Iniciar o Express
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