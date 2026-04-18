import { defineStore } from "pinia";
import { NotebooksAPI } from "../api/notebooks";
import { DocumentsAPI } from "../api/documents";
import { ChatAPI } from "../api/chat";
import { ToolsAPI } from "../api/tools";

export const useNotebookStore = defineStore("notebook", {
  state: () => ({
    notebook: null,
    documents: [],
    selectedDocIds: new Set(),
    messages: [],
    assets: [],
    selectedModel: localStorage.getItem("rb.model") || "",
    streaming: null, // { id, content, stages:[{key,label,state}], model }
    loading: {
      notebook: false,
      documents: false,
      messages: false,
      assets: false,
      chat: false,
      upload: false,
      tool: false,
    },
    error: "",
  }),
  getters: {
    activeDocIds: (s) => Array.from(s.selectedDocIds),
  },
  actions: {
    reset() {
      this.notebook = null;
      this.documents = [];
      this.selectedDocIds = new Set();
      this.messages = [];
      this.assets = [];
      this.streaming = null;
      this.error = "";
    },

    setModel(name) {
      this.selectedModel = name || "";
      if (name) localStorage.setItem("rb.model", name);
      else localStorage.removeItem("rb.model");
    },

    async loadAll(id) {
      this.reset();
      this.loading.notebook = true;
      try {
        this.notebook = await NotebooksAPI.get(id);
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading.notebook = false;
      }
      await Promise.all([this.fetchDocuments(id), this.fetchMessages(id), this.fetchAssets(id)]);
    },

    async fetchDocuments(notebookId) {
      this.loading.documents = true;
      try {
        this.documents = await DocumentsAPI.list(notebookId);
        this.selectedDocIds = new Set(this.documents.map((d) => d.id));
      } finally {
        this.loading.documents = false;
      }
    },

    toggleDoc(id) {
      const s = new Set(this.selectedDocIds);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      this.selectedDocIds = s;
    },

    selectAllDocs(on) {
      this.selectedDocIds = on
        ? new Set(this.documents.map((d) => d.id))
        : new Set();
    },

    async uploadDocument(file, onProgress) {
      this.loading.upload = true;
      try {
        await DocumentsAPI.upload(this.notebook.id, file, onProgress);
        await this.fetchDocuments(this.notebook.id);
      } finally {
        this.loading.upload = false;
      }
    },

    async removeDocument(id) {
      await DocumentsAPI.remove(id);
      this.documents = this.documents.filter((d) => d.id !== id);
      const s = new Set(this.selectedDocIds);
      s.delete(id);
      this.selectedDocIds = s;
    },

    async fetchMessages(notebookId) {
      this.loading.messages = true;
      try {
        this.messages = await ChatAPI.messages(notebookId);
      } finally {
        this.loading.messages = false;
      }
    },

    async sendMessage(text) {
      if (!text.trim() || !this.notebook) return;
      const optimistic = {
        id: `tmp-u-${Date.now()}`,
        role: "user",
        content: text,
        sources: [],
      };
      this.messages = [...this.messages, optimistic];
      this.loading.chat = true;
      this.streaming = {
        id: `tmp-a-${Date.now()}`,
        content: "",
        stages: [],
        model: this.selectedModel || null,
      };

      const pushStage = (key) => {
        if (!this.streaming) return;
        const label = STAGE_LABELS[key] || key;
        const stages = [...this.streaming.stages];
        for (const s of stages) if (s.state === "active") s.state = "done";
        if (!stages.some((s) => s.key === key)) {
          stages.push({ key, label, state: "active" });
        }
        this.streaming = { ...this.streaming, stages };
      };

      try {
        console.log("[Store.sendMessage] calling ChatAPI.stream");
        await ChatAPI.stream(
          {
            notebookId: this.notebook.id,
            mensagem: text,
            docIds: this.activeDocIds.length ? this.activeDocIds : null,
            model: this.selectedModel || undefined,
          },
          {
            onUserSaved: ({ id }) => {
              console.log("[Store.onUserSaved] id:", id);
              this.messages = this.messages.map((m) =>
                m.id === optimistic.id ? { ...m, id } : m
              );
            },
            onStage: ({ stage }) => {
              console.log("[Store.onStage] stage:", stage, "streaming:", !!this.streaming);
              if (!this.streaming) return;
              if (stage === "done") {
                const stages = this.streaming.stages.map((s) => ({ ...s, state: "done" }));
                this.streaming = { ...this.streaming, stages };
              } else {
                pushStage(stage);
              }
              console.log("[Store.onStage] stages now:", JSON.stringify(this.streaming?.stages));
            },
            onToken: (t) => {
              if (!this.streaming) return;
              this.streaming = {
                ...this.streaming,
                content: this.streaming.content + t,
              };
            },
            onDone: (payload) => {
              console.log("[Store.onDone] payload:", payload);
              const msg = {
                id: payload.id,
                role: "assistant",
                content: payload.content,
                sources: payload.sources || [],
                model: payload.model,
                tokens: payload.tokens,
                processingTime: payload.processingTime,
              };
              this.messages = [...this.messages, msg];
              this.streaming = null;
            },
            onError: (m) => {
              console.error("[Store.onError]", m);
              this.messages = [
                ...this.messages,
                {
                  id: `err-${Date.now()}`,
                  role: "assistant",
                  content: `⚠️ ${m}`,
                  sources: [],
                },
              ];
              this.streaming = null;
            },
          }
        );
        console.log("[Store.sendMessage] stream call completed");
      } finally {
        this.loading.chat = false;
      }
    },

    async fetchAssets(notebookId) {
      this.loading.assets = true;
      try {
        this.assets = await ToolsAPI.list(notebookId);
      } finally {
        this.loading.assets = false;
      }
    },

    async generateTool({ type, prompt, count, difficulty }) {
      if (!this.notebook) return;
      this.loading.tool = true;
      try {
        const docIds = this.activeDocIds.length ? this.activeDocIds : null;
        if (type === "quiz") {
          await ToolsAPI.generateQuiz({
            notebookId: this.notebook.id,
            docIds,
            prompt,
            numQuestions: count,
            difficulty,
          });
        } else {
          await ToolsAPI.generateFlashcards({
            notebookId: this.notebook.id,
            docIds,
            prompt,
            numCards: count,
            difficulty,
          });
        }
        await this.fetchAssets(this.notebook.id);
      } finally {
        this.loading.tool = false;
      }
    },

    async removeAsset(id) {
      await ToolsAPI.remove(id);
      this.assets = this.assets.filter((a) => a.id !== id);
    },
  },
});

const STAGE_LABELS = {
  retrieving_store: "Connecting to vector store",
  detecting_language: "Detecting language",
  building_queries: "Building search queries",
  searching_documents: "Searching documents",
  reranking: "Reranking candidates",
  generating_answer: "Generating answer",
  extracting_sources: "Extracting sources",
  no_results: "No matching passages",
  done: "Done",
  error: "Error",
};
