<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="" />
    <img alt="ReCallBook" src="" width="120" />
  </picture>
</p>

<h1 align="center">ReCallBook</h1>

<p align="center">
  <em>Your Local RAG-Powered Study Assistant</em>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#system-requirements">Requirements</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#how-the-rag-pipeline-works">How It Works</a> •
  <a href="#development">Development</a>
</p>

---

## Overview

**ReCallBook** is a fully local, privacy-first Retrieval-Augmented Generation (RAG) study platform. Upload your documents (PDFs, images, text files) and let AI analyze them — no data ever leaves your machine.

Inspired by [NotebookLM](https://notebooklm.google.com), built entirely with open-source tools and designed for students, educators, researchers, and professionals who need to work with sensitive or confidential information.

Created by **Frederico Ferreira Gouveia** as part of his Prova de Aptidão Profissional (PAP) at Curso Técnico de Gestão e Programação de Sistemas Informáticos, 2025/2026.

### Why the name?

| Part | Meaning |
|------|---------|
| **Re** | Repetition, revisiting, redoing queries |
| **Call** | Calling tools, functions, and information |
| **recall** | Remembering and retrieving information (English) |
| **Book** | Notebook — the platform's core unit for organizing knowledge |

---

## Features

- **Notebooks** — Organize your study materials into named notebooks
- **Document Upload** — Upload PDFs (with embedded image extraction), JPEG/PNG/SVG images, and text/markdown files (up to 50 MB)
- **RAG Chat** — Ask questions about your documents. The system retrieves relevant content from your documents and generates answers with cited sources
- **Streaming Responses** — Real-time SSE streaming with stage indicators (retrieving → building queries → searching → reranking → generating → extracting sources)
- **Message Editing** — Edit and resend your last message
- **Quiz Generation** — Automatically generate multiple-choice quizzes (easy/medium/hard) from your documents with score tracking
- **Flashcard Generation** — Create front/back/hint flashcards from document content
- **Note Pinning** — Pin AI responses as notes for later review
- **Vision Model Support** — Analyze images within documents via a separate vision LLM
- **Multi-Language Interface** — English and Portuguese UI with labels; the AI responds in your chosen language
- **Dark / Light Theme** — Persistent, terminal-inspired dark mode
- **Multi-User Authentication** — JWT-based auth with bcrypt password hashing, ownership verification, and rate limiting

---

## Architecture

```
┌──────────────┐      ┌──────────────────────────────────────────────────────┐
│              │      │                   Express 5 API                       │
│   Vue 3 SPA  │─────▶│                                                      │
│   (Vite)     │      │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│              │      │  │   Auth   │  │Notebooks │  │Documents │           │
│  Pinia       │◀────▶│  ├──────────┤  ├──────────┤  ├──────────┤           │
│  Vue Router  │      │  │   Chat   │  │  Tools   │  │  Ollama  │           │
│  Tailwind    │      │  │ (Stream) │  │Qz/Flash  │  │ Mgmt     │           │
│  Radix Vue   │      │  └────┬─────┘  └──────────┘  └──────────┘           │
└──────────────┘      │       │                                              │
                      │       ▼                                              │
                      │  ┌──────────────────┐     ┌──────────────────────┐   │
                      │  │   Chat Service   │     │  Cross-Encoder       │   │
                      │  │   (RAG Pipeline) │────▶│  (HuggingFace        │   │
                      │  │                  │     │   Transformers)      │   │
                      │  └──┬────┬────┬─────┘     └──────────────────────┘   │
                      │     │    │    │                                       │
                      │     ▼    ▼    ▼                                       │
                      │  ┌────┐ ┌───┐ ┌─────────┐                            │
                      │  │My  │ │Qd │ │ Ollama  │                            │
                      │  │SQL │ │rant│ │ (LLM +  │                            │
                      │  │    │ │    │ │Embed)   │                            │
                      │  └────┘ └───┘ └─────────┘                            │
                      └──────────────────────────────────────────────────────┘
```

**Key flow:**
1. **Frontend** (Vue 3 SPA) communicates with the **Express 5 API** via REST + SSE streaming
2. **MySQL** stores user accounts, notebooks, messages, and asset metadata
3. **Qdrant** (vector database) stores document chunk embeddings for semantic search
4. **Ollama** serves the LLM (chat) and embedding model locally
5. **HuggingFace Transformers** runs an in-process cross-encoder reranker for result refinement

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | [Vue 3](https://vuejs.org/) (Composition API), [Pinia](https://pinia.vuejs.org/) (state), [Vue Router 4](https://router.vuejs.org/), [Tailwind CSS 3](https://tailwindcss.com/), [Radix Vue](https://www.radix-vue.com/), [Lucide Icons](https://lucide.dev/), [Axios](https://axios-http.com/), [Vite 5](https://vitejs.dev/) |
| **Backend** | [Node.js 22+](https://nodejs.org/), [Express 5](https://expressjs.com/), [LangChain.js](https://js.langchain.com/), [Zod](https://zod.dev/) |
| **Relational Database** | [MySQL 8.0](https://www.mysql.com/) (via Docker) |
| **Vector Database** | [Qdrant](https://qdrant.tech/) (via Docker) |
| **LLM Runtime** | [Ollama](https://ollama.com/) (native install) |
| **Embedding Model** | [bge-m3](https://ollama.com/library/bge-m3) via Ollama |
| **Reranker** | [jina-reranker-v2-base-multilingual](https://huggingface.co/jinaai/jina-reranker-v2-base-multilingual) (in-process via [HuggingFace Transformers](https://huggingface.co/docs/transformers.js/)) |
| **Authentication** | JWT ([jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) + [bcryptjs](https://github.com/dcodeIO/bcrypt.js)) |
| **PDF Processing** | [pdfjs-dist](https://www.npmjs.com/package/pdfjs-dist) + [sharp](https://sharp.pixelplumbing.com/) (image extraction) |
| **Testing** | [Jest 30](https://jestjs.io/) + [Supertest](https://github.com/ladjs/supertest) |
| **Containerization** | [Docker Compose](https://docs.docker.com/compose/) (data services only) |
| **Installation** | Bash / PowerShell scripts with dependency auto-detection |

---

## System Requirements

### Minimum

| Component | Specification |
|-----------|--------------|
| **CPU** | 4 cores |
| **RAM** | 8 GB |
| **Storage** | 10 GB free |
| **GPU** | None required (CPU-only inference works) |
| **OS** | Linux, macOS, or Windows (via WSL2) |
| **Software** | Docker, Node.js 22+, Ollama, Git |

With the minimum setup you can run small models (e.g., `llama3.2:3b`).
Expect slower response times — especially on PDF parsing and AI inference.

### Recommended

| Component | Specification |
|-----------|--------------|
| **CPU** | 6+ cores |
| **RAM** | 16+ GB |
| **Storage** | 20+ GB SSD |
| **GPU** | NVIDIA GPU with 6+ GB VRAM (for faster LLM inference) |
| **OS** | Linux (Ubuntu 22.04+), macOS, or Windows (via WSL2) |
| **Software** | Docker, Node.js 22+, Ollama, Git, NVIDIA Container Toolkit (if using GPU) |

With the recommended setup you can run larger models (7B–14B parameters) and get near-instant responses.

---

## Recommended Models

> **Note:** The development team's recommended models will be listed here. Below are general guidelines.

### Embedding Model (Required)

| Model | Purpose |
|-------|---------|
| `bge-m3` (default) | Document and query embeddings for semantic search. **Required.** |

### Chat / General Models

| Model | Size | RAM Usage | Quality |
|-------|------|-----------|---------|
| *(to be filled)* | | | |
| *(to be filled)* | | | |
| *(to be filled)* | | | |

### Vision Models (for image analysis)

| Model | Purpose |
|-------|---------|
| *(to be filled)* | Analyzing images inside documents |

### Query Builder Model (optional)

| Model | Purpose |
|-------|---------|
| *(to be filled)* | Expanding user queries for better search results |

**Tip:** You can set different models for general chat, query building, and vision in the application's Configuration page.

---

## Quick Start

### Prerequisites

- [Git](https://git-scm.com/)
- [Docker](https://docs.docker.com/get-docker/)
- [Node.js 22+](https://nodejs.org/)
- [Ollama](https://ollama.com/)

### Automatic Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ReCallBook.git
cd ReCallBook

# Run the installer (Linux/macOS)
chmod +x install/install.sh
./install/install.sh

# Start everything
./recallbook.sh start
```

The installer will:
1. Check all prerequisites (git, curl, docker, Node.js 22+, Ollama)
2. Install Ollama if missing
3. Create data directories
4. Copy `.env.example` to `.env` (if not present)
5. Install npm dependencies for both backend and frontend
6. Build the frontend
7. Start MySQL and Qdrant via Docker Compose
8. Pull the configured Ollama models

### Manual Installation

```bash
# 1. Install dependencies
cd app && npm install
cd ../frontend && npm install && npm run build
cd ..

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings

# 3. Start data services (MySQL + Qdrant)
docker compose -f docker-compose.data.yml up -d

# 4. Start the app
cd app && npm start
```

### Starting & Stopping

```bash
# Start interactively (Ctrl+C to stop)
./recallbook.sh start

# Start in background
./recallbook.sh start --daemon

# Check status of all services
./recallbook.sh status

# View logs
./recallbook.sh logs

# Stop everything
./recallbook.sh stop

# Enable auto-start on boot
./recallbook.sh service install
```

### Windows

Use the PowerShell scripts instead:

```powershell
.\install\install.ps1
.\recallbook.ps1 start
```

---

## Configuration

All configuration is done via the `.env` file in the project root. Copy `.env.example` to `.env` and adjust:

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `change-me-to-a-random-string` | **Change this.** Secret key for JWT token signing. |
| `DB_PASSWORD` | `recallbook` | MySQL root password |
| `DB_NAME` | `recallbook` | MySQL database name |
| `MYSQL_PORT` | `3306` | MySQL port |
| `QDRANT_PORT` | `6333` | Qdrant port |
| `OLLAMA_PORT` | `11434` | Ollama port |
| `BACKEND_PORT` | `3000` | Express API port |
| `FRONTEND_PORT` | `9090` | Frontend dev server port (development only) |
| `OLLAMA_MODELS` | `bge-m3,llama3.2` | Comma-separated models to auto-download |
| `CORS_ORIGINS` | `http://localhost:9090` | Allowed CORS origins (comma-separated) |
| `OLLAMA_EMBEDDING_MODEL` | `bge-m3` | Override the embedding model |
| `JWT_EXPIRES_IN` | `7d` | JWT token expiry duration |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_USER` | `root` | MySQL user |
| `NODE_ENV` | *(empty)* | Set to `production` for stricter CORS |

---

## Project Structure

```
ReCallBook/
├── .env                    # Local environment configuration
├── .env.example            # Configuration template with documentation
├── docker-compose.data.yml # MySQL 8.0 + Qdrant containers
├── recallbook.sh           # Linux/macOS service control script
├── recallbook.ps1          # Windows service control script
├── app/                    # Backend (Node.js / Express 5)
│   ├── package.json
│   ├── src/
│   │   ├── app.js              # Entry point: Express setup + init sequence
│   │   ├── api/                # REST route handlers
│   │   │   ├── auth.js         # Registration, login, profile, password
│   │   │   ├── chat.js         # Messages, ask, SSE streaming
│   │   │   ├── documents.js    # Upload, list, view, delete docs
│   │   │   ├── health.js       # Health check endpoint
│   │   │   ├── notebooks.js    # CRUD for notebooks
│   │   │   ├── ollama.js       # List/show/pull models via Ollama
│   │   │   ├── tools.js        # Quiz, flashcards, notes generation
│   │   │   └── user.js         # User model preferences
│   │   ├── db/
│   │   │   ├── init.js         # MySQL connection pool + schema
│   │   │   └── qdrant.js       # Qdrant vector DB client + collection
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT sign/verify, requireAuth
│   │   │   ├── errorHandler.js # Centralized error handler
│   │   │   ├── ownership.js    # Notebook/doc/asset ownership checks
│   │   │   └── rateLimiter.js  # API + auth rate limiting
│   │   ├── services/
│   │   │   ├── agent.js        # Ollama LLM factory (ChatOllama)
│   │   │   ├── chatService.js  # RAG pipeline orchestrator
│   │   │   ├── cross_encoder.js# In-process reranker
│   │   │   ├── embeddings.js   # Ollama embeddings (bge-m3)
│   │   │   ├── vision.js       # Image analysis via vision LLM
│   │   │   └── tools/
│   │   │       ├── quizTool.js      # Quiz generation
│   │   │       └── flashcardTool.js # Flashcard generation
│   │   └── utils/
│   │       ├── contextUtils.js     # Context + source extraction
│   │       ├── languageLabels.js   # i18n (English/Portuguese)
│   │       ├── logger.js           # Database + console logging
│   │       ├── promptUtils.js      # Query + answer generation
│   │       ├── searchUtils.js      # Vector search with dedup
│   │       ├── truncateContext.js  # Context length limiter
│   │       ├── validation.js       # Sanitization, filter builder
│   │       ├── validationSchemas.js# Zod schemas + middleware
│   │       └── readers/
│   │           ├── pdfParser.js    # PDF text + image extraction
│   │           └── textParser.js   # Plain text/markdown parsing
│   └── tests/                 # Jest test suite (9 test files)
├── frontend/                 # Frontend (Vue 3 SPA)
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── public/
│   │   ├── favicon.svg
│   │   └── robots.txt
│   └── src/
│       ├── main.js               # Vue app bootstrap
│       ├── App.vue                # Root component
│       ├── styles.css             # Tailwind + custom CSS variables
│       ├── router/index.js        # Routes
│       ├── api/                   # Axios API clients
│       │   ├── http.js            # Axios instance + auth interceptor
│       │   ├── auth.js
│       │   ├── chat.js            # SSE stream reader
│       │   ├── documents.js
│       │   ├── notebooks.js
│       │   ├── ollama.js
│       │   ├── sse.js             # SSE block parser
│       │   ├── tools.js
│       │   └── user.js
│       ├── stores/                # Pinia state stores
│       │   ├── auth.js
│       │   ├── models.js
│       │   ├── notebook.js
│       │   ├── notebooks.js
│       │   ├── theme.js
│       │   └── toast.js
│       ├── views/                 # Page components
│       │   ├── LoginView.vue
│       │   ├── SignupView.vue
│       │   ├── DashboardView.vue
│       │   ├── NotebookView.vue
│       │   └── ConfigurationsView.vue
│       └── components/            # UI components
│           ├── common/            # AppHeader, AppModal, AppToast, Spinner
│           ├── dashboard/         # CreateNotebookModal, NotebookCard
│           ├── notebook/          # FilesPanel, ChatPanel, ToolsPanel
│           └── viewers/           # PdfViewer, ImageViewer, QuizViewer, FlashcardsViewer, NoteViewer
├── install/                  # Installation scripts
│   ├── install.sh            # Linux/macOS
│   └── install.ps1           # Windows
├── scripts/
│   └── pull-models.sh        # Ollama model puller
└── pap-DB_versão_alpha0.9.drawio.svg  # Database schema diagram
```

---

## How the RAG Pipeline Works

ReCallBook uses a multi-stage **Retrieval-Augmented Generation** pipeline to answer questions based on your documents.

### 1. Document Ingestion

```
Upload (PDF/Image/Text)
        │
        ▼
  Parse & Extract
  ├── PDF: text via pdfjs-dist + image extraction via sharp + vision LLM
  ├── Image: direct vision LLM analysis
  └── Text: direct UTF-8 parsing
        │
        ▼
  Text Splitting (LangChain RecursiveCharacterTextSplitter)
  ── Chunks of configurable size with overlap ──
        │
        ▼
  Embedding (bge-m3 via Ollama)
  ── Each chunk converted to a 1024-dim dense vector ──
        │
        ▼
  Qdrant Vector Store
  ── Chunks stored with payload (notebook_id, fonte_id, source_text) ──
```

### 2. Query Processing

```
User Question
        │
        ▼
  Multi-Query Expansion (optional)
  ── A dedicated query-builder model generates
     3 alternative phrasings of the question ──
        │
        ▼
  Embed Queries (bge-m3)
        │
        ▼
  Vector Search (Qdrant)
  ── Dense similarity search with score threshold ──
        │
        ▼
  Deduplication (by chunk content hash)
        │
        ▼
  Cross-Encoder Reranking
  ── jina-reranker-v2-base-multilingual (in-process)
     Re-scores top-N chunks by relevance to the query ──
        │
        ▼
  Context Assembly
  ── Top-K chunks assembled with source citations ──
```

### 3. Answer Generation

```
Assembled Context + Conversation History (last 6 messages)
        │
        ▼
  LLM Generation (Ollama)
  ── Model generates answer with [n] citations
     referencing source chunks ──
        │
        ▼
  Source Extraction
  ── Regex-based extraction of [n] markers
     → maps to original document + page ──
        │
        ▼
  Streamed Response (SSE)
  ── Real-time streaming with stage indicators ──
```

### 4. Tool Generation

**Quizzes** and **Flashcards** are generated via the same RAG pipeline but use **structured LLM output**:

- **Quiz**: Zod schema defines question, 4 options, correct answer, difficulty, and rationale
- **Flashcard**: Zod schema defines front text, back text, and hint

Both tools create a `Notebook_asset` in MySQL with the full content stored as JSON, allowing review and re-generation.

---

## API Reference

| Base Path | Auth | Description |
|-----------|------|-------------|
| `GET /api/health` | No | Health check (returns MySQL + Qdrant status) |
| `POST /api/auth/register` | No | Create a new account |
| `POST /api/auth/login` | No | Authenticate and receive JWT |
| `GET /api/auth/profile` | Yes | Get current user profile |
| `PUT /api/auth/password` | Yes | Change password |
| `GET /api/notebooks` | Yes | List user's notebooks |
| `POST /api/notebooks` | Yes | Create a new notebook |
| `GET /api/notebooks/:id` | Yes | Get notebook details |
| `PUT /api/notebooks/:id` | Yes | Update notebook |
| `DELETE /api/notebooks/:id` | Yes | Delete notebook |
| `POST /api/documents/upload` | Yes | Upload a document to a notebook |
| `GET /api/documents/:notebookId` | Yes | List documents in a notebook |
| `GET /api/documents/view/:docId` | Yes | View/download a document |
| `DELETE /api/documents/:docId` | Yes | Delete a document |
| `POST /api/chat/ask` | Yes | Send a message (non-streaming) |
| `POST /api/chat/stream` | Yes | Send a message (SSE streaming) |
| `GET /api/chat/messages/:notebookId` | Yes | Get message history |
| `POST /api/tools/quiz` | Yes | Generate quiz from document(s) |
| `POST /api/tools/flashcards` | Yes | Generate flashcards from document(s) |
| `POST /api/tools/notes` | Yes | Pin an AI message as a note |
| `GET /api/ollama/models` | Yes | List available Ollama models |
| `POST /api/ollama/pull` | Yes | Pull a new Ollama model |
| `PUT /api/user/model-config` | Yes | Set user's preferred AI models |

---

## Development

### Running in Development Mode

```bash
# Start backend (port 3000)
cd app
npm run dev

# In another terminal, start frontend dev server (port 5173)
cd frontend
npm run dev
```

In development mode:
- Frontend runs on Vite dev server at `http://localhost:5173` with hot-reload
- API proxy is configured to forward `/api` requests to `http://localhost:3000`
- CORS allows requests without an `Origin` header

### Running Tests

```bash
cd app
npm test
```

The test suite covers:
- Health check endpoint
- Authentication (register, login, JWT validation)
- Notebook CRUD with ownership (IDOR) protection
- Error handling (AppError, file size, JSON parse, 500)
- Rate limiting configuration
- Cross-encoder reranker
- Validation utilities (sanitization, filter building)

### Production Build

```bash
cd frontend
npm run build
```

In production (`NODE_ENV=production`):
- Express serves the built frontend from `frontend/dist/`
- CORS requires a valid `Origin` header
- Frontend is served for all routes not matching `/api`

---

## Docker / Deployment

ReCallBook uses Docker **only for data services** — the app itself runs natively.

```bash
# Start data services (MySQL + Qdrant)
docker compose -f docker-compose.data.yml up -d

# Stop data services
docker compose -f docker-compose.data.yml down
```

**Why not run the app in Docker?**
- Ollama needs direct GPU access and runs better natively
- The app interacts with Ollama's local API and HuggingFace model cache
- Native execution simplifies debugging and resource management

---

## FAQ / Troubleshooting

**Q: Which port does the app use?**  
A: The backend API runs on port `3000` by default. The frontend dev server runs on port `5173`. Both are configurable via `.env`.

**Q: Can I use a GPU with Ollama?**  
A: Yes. Ollama automatically detects NVIDIA GPUs on Linux. On Windows, use WSL2. The installer checks for GPU support.

**Q: How do I add more documents after setup?**  
A: Inside the app — open a notebook, go to the Files panel, and click Upload.

**Q: The AI is responding slowly. What can I do?**  
A: Try a smaller model (e.g., `llama3.2:3b`), ensure you meet the recommended specs, or check if Ollama is using your GPU.

**Q: I forgot the default JWT secret warning.**  
A: If you see `JWT_SECRET is still set to the default value.` in the logs, change `JWT_SECRET` in your `.env` file immediately. The default secret is insecure.

**Q: The cross-encoder model fails to download.**  
A: The first startup downloads `jina-reranker-v2-base-multilingual` (~1.5 GB) from HuggingFace. This happens in the background. If it fails, the system retries lazily on the first rerank operation. Check your internet connection and disk space.

**Q: Can I use this without Docker?**  
A: You could run MySQL and Qdrant natively, but Docker Compose is the recommended and tested approach for the data services.

---

## Roadmap

- [x] Core RAG pipeline with streaming
- [x] PDF, image, and text document support
- [x] Quiz and flashcard generation
- [x] Multi-language UI (English/Portuguese)
- [x] Dark/light theme
- [x] JWT authentication with ownership control
- [x] Native installation scripts (all platforms)
- [ ] Recommended model list (development team)
- [ ] Language improvements for AI responses
- [ ] Dark mode refinement
- [ ] Docker-based all-in-one deployment option
- [ ] YouTube video transcript support

---

<p align="center">
  <sub>Built with ❤️ by <strong>Frederico Ferreira Gouveia</strong></sub><br />
  <sub>Curso Técnico de Gestão e Programação de Sistemas Informáticos — PAP 2025/2026</sub>
</p>
