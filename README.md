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
  <a href="#prerequisites">Prerequisites</a> •
  <a href="#installation">Installation</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#how-the-rag-pipeline-works">How It Works</a> •
  <a href="#development">Development</a>
</p>

---

## Overview

O **ReCallBook** é uma plataforma de estudo assistida por Inteligência Artificial baseada em Retrieval-Augmented Generation (RAG), 100% local e focada na privacidade. Carrega os teus documentos (PDFs, imagens, ficheiros de texto) e deixa a IA analisá-los, nenhum dado sai da tua máquina.

Inspirado no [NotebookLM](https://notebooklm.google.com), construído inteiramente com ferramentas open source e desenhado para estudantes, educadores, investigadores e profissionais que precisam de trabalhar com informação sensível ou confidencial.

Criado por **Frederico Ferreira Gouveia** no âmbito da Prova de Aptidão Profissional (PAP) do Curso Técnico de Gestão e Programação de Sistemas Informáticos, 2025/2026.

### Porquê o nome?

| Parte | Significado |
|-------|------------|
| **Re** | Repetição, revisitar, refazer perguntas |
| **Call** | Chamar ferramentas, funções e informação |
| **recall** | Lembrar e recuperar informação (inglês) |
| **Book** | Caderno, a unidade central da plataforma para organizar conhecimento |

---

## Features

- **Notebooks**, Organiza os teus materiais de estudo em cadernos nomeados
- **Upload de Documentos**, Carrega PDFs (com extração de imagens incorporadas), JPEG/PNG/SVG e ficheiros de texto/markdown (até 50 MB)
- **Chat RAG**, Faz perguntas sobre os teus documentos. O sistema recupera o conteúdo relevante e gera respostas com fontes citadas
- **Streaming de Respostas**, Streaming em tempo real via SSE com indicadores de fase (a recuperar, a construir queries, a pesquisar, a reordenar, a gerar, a extrair fontes)
- **Edição de Mensagens**, Edita e reenvia a tua última mensagem
- **Geração de Quizzes**, Gera automaticamente quizzes de escolha múltipla (fácil/médio/difícil) a partir dos documentos com registo de pontuação
- **Geração de Flashcards**, Cria flashcards (frente/verso/dica) a partir do conteúdo dos documentos
- **Fixar Notas**, Fixa respostas da IA como notas para revisão posterior
- **Suporte a Vision Model**, Analisa imagens dentro de documentos através de uma LLM de visão dedicada
- **Interface Multilíngue**, Interface em Inglês e Português com etiquetas; a IA responde no idioma escolhido
- **Tema Escuro / Claro**, Modo escuro persistente inspirado em terminais
- **Autenticação Multi-Utilizador**, Autenticação JWT com hashing de passwords (bcrypt), verificação de propriedade e rate limiting

---

## Architecture

**Fluxo principal:**
1. O **Frontend** (Vue 3 SPA) comunica com a **Express 5 API** via REST + SSE streaming
2. A **MySQL** armazena contas de utilizador, notebooks, mensagens e metadados de assets
3. A **Qdrant** (vector database) armazena os embeddings dos chunks dos documentos para pesquisa semântica
4. O **Ollama** serve o LLM (chat) e o modelo de embeddings localmente
5. O **HuggingFace Transformers** executa um cross-encoder reranker em processo para refinamento dos resultados

---

## Tech Stack

| Camada | Tecnologia |
|-------|-----------|
| **Frontend** | [Vue 3](https://vuejs.org/) (Composition API), [Pinia](https://pinia.vuejs.org/) (estado), [Vue Router 4](https://router.vuejs.org/), [Tailwind CSS 3](https://tailwindcss.com/), [Radix Vue](https://www.radix-vue.com/), [Lucide Icons](https://lucide.dev/), [Axios](https://axios-http.com/), [Vite 5](https://vitejs.dev/) |
| **Backend** | [Node.js 22+](https://nodejs.org/), [Express 5](https://expressjs.com/), [LangChain.js](https://js.langchain.com/), [Zod](https://zod.dev/) |
| **Base de Dados Relacional** | [MySQL 8.0](https://www.mysql.com/) (via Docker) |
| **Base de Dados Vetorial** | [Qdrant](https://qdrant.tech/) (via Docker) |
| **Runtime LLM** | [Ollama](https://ollama.com/) (instalação nativa) |
| **Modelo de Embeddings** | [bge-m3](https://ollama.com/library/bge-m3) via Ollama |
| **Reranker** | [jina-reranker-v2-base-multilingual](https://huggingface.co/jinaai/jina-reranker-v2-base-multilingual) (em processo via [HuggingFace Transformers](https://huggingface.co/docs/transformers.js/)) |
| **Autenticação** | JWT ([jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) + [bcryptjs](https://github.com/dcodeIO/bcrypt.js)) |
| **Processamento de PDFs** | [pdfjs-dist](https://www.npmjs.com/package/pdfjs-dist) + [sharp](https://sharp.pixelplumbing.com/) (extração de imagens) |
| **Testes** | [Jest 30](https://jestjs.io/) + [Supertest](https://github.com/ladjs/supertest) |
| **Contentorização** | [Docker Compose](https://docs.docker.com/compose/) (apenas serviços de dados) |
| **Instalação** | Scripts Bash / PowerShell com deteção automática de dependências |

---

## Prerequisites

### System Prerequisites

| Software | Required Version | Description |
|----------|-----------------|-------------|
| **Git** | 2.47.1+ | Utilizado para clonar o repositório do projeto |
| **cURL** | 8.19.0+ | Utilizado pelo script de instalação para verificar a saúde do Qdrant e da API do Ollama |
| **Docker** | 29.1.2+ | Pilar da arquitetura do ReCallBook. Executa os contentores do MySQL e do Qdrant |
| **Node.js** | 24.14.0 | A aplicação é construída em Node.js, tanto no backend como no frontend |

### Hardware Requirements

#### Minimum

| Component | Specification |
|-----------|--------------|
| **Processador** | Qualquer processador 64 bits moderno |
| **RAM** | 8 GB DDR4 |
| **Armazenamento** | 10 GB Livres |
| **GPU** | Não necessário |

Com a configuração mínima consegues executar modelos pequenos, como o `qwen3.5:0.8b` ou o `llama3.2:3b`.

#### Recommended

| Component | Specification |
|-----------|--------------|
| **Processador** | 8+ núcleos a 3.5 GHz |
| **RAM** | 16 GB DDR4 |
| **Armazenamento** | 20 GB Livres |
| **GPU** | GPU com 12+ GB VRAM |

Para uma melhor perceção de quais modelos cada máquina consegue rodar, recomenda-se o uso de ferramentas como [llmfit](https://llmfit.com).

---

## Recommended Models

> **Nota:** Abaixo estão os modelos recomendados para cada função no ReCallBook. O modelo de embeddings (`bge-m3`) é obrigatório; os restantes podem ser alterados nas Configurações.

### Embedding Model (Obrigatório)

| Modelo | Propósito |
|-------|---------|
| `bge-m3` (padrão) | Embeddings de documentos e queries para pesquisa semântica. **Obrigatório.** |

### Chat / General Models

| Modelo | Propósito |
|-------|---------|
| `gpt-oss:20b` | Máxima qualidade. Requer GPU com 12 GB+ VRAM |
| `gemma4:12b` | Alternativa sólida com boa compreensão contextual |
| `llama3:8b` | Modelo principal recomendado. Bom equilíbrio entre qualidade e desempenho |
| `llama3.2:3b` | Leve, funciona em qualquer hardware. Ideal para CPU-only |

### Vision Model (para análise de imagens)

| Modelo | Propósito |
|-------|---------|
| `qwen3.5:0.8b` | Análise de imagens dentro de documentos (modelo multimodal) |

### Query Builder Model (opcional)

| Modelo | Propósito |
|-------|---------|
| `llama3:8b` ou `gemma4:12b` | Expandir perguntas do utilizador para melhorar a pesquisa semântica |

**Dica:** Podes definir modelos diferentes para Chat, Query Builder e Vision nas Configurações da aplicação.

---

## Installation

> **Note:** Antes de instalar, certifica-te de que tens uma cópia do projeto (git clone ou download) e que executas os comandos como **administrador** para que seja possível instalar como serviço após a instalação.

### Windows

1. Abrir o **PowerShell como administrador**
2. Navegar até à raiz do projeto
3. Executar o script de instalação:

```powershell
.\install\install.ps1
```

### Linux / macOS

1. Abrir o **terminal como administrador**
2. Navegar até à raiz do projeto
3. Tornar o script executável e executá-lo:

```bash
chmod +x install/install.sh && ./install/install.sh
```

### O que faz o instalador?

O instalador verifica todos os pré-requisitos (git, curl, docker, Node.js, Ollama), instala o Ollama se estiver em falta, cria as diretorias de dados, copia o `.env.example` para `.env` (se não existir), instala as dependências npm do backend e frontend, faz o build do frontend, inicia o MySQL e o Qdrant via Docker Compose e faz o download dos modelos Ollama configurados.

> **Recomendação:** É recomendado criar o ficheiro `.env` a partir do `.env.example` antes de instalar, com as configurações desejadas (modelos, etc.), para que o instalador faça o download automático dos modelos corretos.

### Post-Installation Commands

| Command | Description |
|---------|-------------|
| `./recallbook.sh start` | Inicia todos os serviços interativamente (Ctrl+C para parar) |
| `./recallbook.sh start --daemon` | Inicia todos os serviços em segundo plano |
| `./recallbook.sh stop` | Para todos os serviços |
| `./recallbook.sh status` | Exibe o estado do MySQL, Qdrant, Ollama e da aplicação |
| `./recallbook.sh logs [app/frontend]` | Exibe os logs (padrão: app) |
| `./recallbook.sh service install` | Ativa a inicialização automática ao ligar a máquina |
| `./recallbook.sh service uninstall` | Desativa a inicialização automática ao ligar a máquina |

> **Nota para Windows:** substitui `./recallbook.sh` por `.\recallbook.ps1` (ex: `.\recallbook.ps1 start`).

---

## Configuration

Toda a configuração é feita através do ficheiro `.env` na raiz do projeto. Copia o `.env.example` para `.env` e ajusta:

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `JWT_SECRET` | `change-me-to-a-random-string` | **Altera isto.** Chave secreta para assinar tokens JWT. |
| `DB_PASSWORD` | `recallbook` | Palavra-passe root da MySQL |
| `DB_NAME` | `recallbook` | Nome da base de dados MySQL |
| `MYSQL_PORT` | `3306` | Porta da MySQL |
| `QDRANT_PORT` | `6333` | Porta da Qdrant |
| `OLLAMA_PORT` | `11434` | Porta do Ollama |
| `BACKEND_PORT` | `3000` | Porta da API Express |
| `FRONTEND_PORT` | `9090` | Porta do servidor de desenvolvimento frontend (apenas desenvolvimento) |
| `OLLAMA_MODELS` | `bge-m3,llama3.2` | Modelos a descarregar automaticamente (separados por vírgula) |
| `CORS_ORIGINS` | `http://localhost:9090` | Origens CORS permitidas (separadas por vírgula) |
| `OLLAMA_EMBEDDING_MODEL` | `bge-m3` | Substitui o modelo de embeddings predefinido |
| `JWT_EXPIRES_IN` | `7d` | Duração de expiração do token JWT |
| `DB_HOST` | `localhost` | Host da MySQL |
| `DB_USER` | `root` | Utilizador da MySQL |
| `NODE_ENV` | *(vazio)* | Definir para `production` para CORS mais restrito |

---

## Project Structure

```
ReCallBook/
├── .env                    # Local environment configuration
├── .env.example            # Configuration template with documentation
├── docker-compose.yml      # MySQL 8.0 + Qdrant containers
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
└── pap-DB_versao_alpha0.9.drawio.svg  # Database schema diagram
```

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

### Modo de Desenvolvimento

```bash
# Iniciar backend (porta 3000)
cd app
npm run dev

# Noutro terminal, iniciar frontend dev server (porta 5173)
cd frontend
npm run dev
```

Em modo de desenvolvimento:
- O frontend corre no Vite dev server em `http://localhost:5173` com hot-reload
- O proxy da API esta configurado para encaminhar pedidos `/api` para `http://localhost:3000`
- O CORS permite pedidos sem cabecalho `Origin`

### Executar Testes

```bash
cd app
npm test
```

A suite de testes cobre:
- Health check endpoint
- Autenticacao (registo, login, validacao JWT)
- CRUD de notebooks com protecao de ownership (IDOR)
- Error handling (AppError, tamanho de ficheiro, JSON parse, 500)
- Configuracao de rate limiting
- Cross-encoder reranker
- Utilitarios de validacao (sanitizacao, construcao de filtros)

### Production Build

```bash
cd frontend
npm run build
```

Em producao (`NODE_ENV=production`):
- O Express serve o frontend compilado de `frontend/dist/`
- O CORS requer um cabecalho `Origin` valido
- O frontend e servido para todas as rotas que nao correspondam a `/api`

---

## Docker / Deployment

O ReCallBook usa Docker **apenas para os servicos de dados** — a aplicacao corre nativamente.

```bash
# Iniciar servicos de dados (MySQL + Qdrant)
docker compose -f docker-compose.yml up -d

# Parar servicos de dados
docker compose -f docker-compose.yml down
```

---

<p align="center">
  <sub>Feito com ❤️ por <strong>Frederico Ferreira Gouveia</strong></sub><br />
  <sub>Curso Tecnico de Gestao e Programacao de Sistemas Informaticos — PAP 2025/2026</sub>
</p>
