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
    streamAbortController: null,
    toolAbortController: null,
    isGenerating: false,
    generatingToolType: null,
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
      this.streamAbortController = null;
      this.toolAbortController = null;
      this.isGenerating = false;
      this.generatingToolType = null;
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
        const result = await DocumentsAPI.list(notebookId);
        const docs = Array.isArray(result) ? result : result.data || [];
        this.documents = docs;
        this.selectedDocIds = new Set(docs.map((d) => d.id));
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
        const result = await ChatAPI.messages(notebookId);
        this.messages = Array.isArray(result) ? result : result.data || [];
      } finally {
        this.loading.messages = false;
      }
    },

    async sendMessage(text, editMessageId = null) {
      if (!text.trim() || !this.notebook || this.loading.upload || !this.selectedDocIds.size) return;
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
      this.streamAbortController = new AbortController();

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
            ...(editMessageId ? { editMessageId } : {}),
          },
          {
            onUserSaved: ({ id }) => {
              this.messages = this.messages.map((m) =>
                m.id === optimistic.id ? { ...m, id } : m
              );
            },
            onStage: ({ stage }) => {
              if (!this.streaming) return;
              if (stage === "done") {
                const stages = this.streaming.stages.map((s) => ({ ...s, state: "done" }));
                this.streaming = { ...this.streaming, stages };
              } else {
                pushStage(stage);
              }
            },
            onToken: (t) => {
              if (!this.streaming) return;
              this.streaming = {
                ...this.streaming,
                content: this.streaming.content + t,
              };
            },
            onDone: (payload) => {
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
              this.streamAbortController = null;
            },
            onError: (m) => {
              if (m === "Request cancelled") {
                this.streaming = null;
                this.streamAbortController = null;
                return;
              }
              this.messages = this.messages.filter(
                (msg) => msg.id !== optimistic.id
              );
              this.messages = [
                ...this.messages,
                {
                  id: `err-${Date.now()}`,
                  role: "assistant",
                  content: `Error: ${m}`,
                  sources: [],
                },
              ];
              this.streaming = null;
              this.streamAbortController = null;
              this.isGenerating = false;
            },
          },
          this.streamAbortController.signal
        );
      } catch (e) {
        this.messages = this.messages.filter(
          (msg) => !String(msg.id).startsWith("tmp-")
        );
        this.streaming = null;
        this.streamAbortController = null;
        this.isGenerating = false;
        this.error = e.message || "Stream failed";
      } finally {
        this.loading.chat = false;
      }
    },

    stopStreaming() {
      if (!this.streamAbortController) return;
      this.streamAbortController.abort();
      this.streamAbortController = null;
      this.streaming = null;
      this.loading.chat = false;
    },

    stopTool() {
      if (!this.toolAbortController) return;
      this.toolAbortController.abort();
      this.toolAbortController = null;
      this.loading.tool = false;
      this.isGenerating = false;
    },

    async editLastUserMessage(newText) {
      const text = (newText || "").trim();
      if (!text || !this.notebook || this.loading.chat || this.loading.upload) return false;
      let lastUserIndex = -1;
      for (let i = this.messages.length - 1; i >= 0; i--) {
        if (this.messages[i].role === "user") {
          lastUserIndex = i;
          break;
        }
      }
      if (lastUserIndex < 0) return false;
      const editMessageId = this.messages[lastUserIndex].id;
      this.messages = this.messages.slice(0, lastUserIndex);
      await this.sendMessage(text, editMessageId);
      return true;
    },

    async pinMessage(message) {
      if (!this.notebook || !message?.content) return;
      const result = await ToolsAPI.saveNote({
        notebookId: this.notebook.id,
        content: message.content,
      });
      const content = message.content;
      const title = content.slice(0, 60).replace(/\n/g, " ") + (content.length > 60 ? "…" : "");
      // Prepend the new note directly — no full re-fetch needed
      this.assets = [
        { id: result.id, type: "note", title, created_at: new Date().toISOString(), _new: true },
        ...this.assets,
      ];
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
      if (!this.notebook || this.isGenerating) return;
      this.loading.tool = true;
      this.isGenerating = true;
      this.generatingToolType = type;
      this.toolAbortController = new AbortController();
      try {
        const docIds = this.activeDocIds.length ? this.activeDocIds : null;
        const signal = this.toolAbortController.signal;
        let result;
        if (type === "quiz") {
          result = await ToolsAPI.generateQuiz({
            notebookId: this.notebook.id,
            docIds,
            prompt,
            numQuestions: count,
            difficulty,
            model: this.selectedModel || undefined,
            signal,
          });
        } else {
          result = await ToolsAPI.generateFlashcards({
            notebookId: this.notebook.id,
            docIds,
            prompt,
            numCards: count,
            difficulty,
            model: this.selectedModel || undefined,
            signal,
          });
        }
        // Derive the title the same way the backend does
        let title;
        if (type === "quiz") {
          title = prompt?.trim() ? `Quiz: ${prompt.slice(0, 40)}` : `Quiz (${count} questions)`;
        } else {
          title = prompt?.trim() ? `Flashcards: ${prompt.slice(0, 40)}` : `Flashcards (${count})`;
        }
        // Prepend the new asset directly — no full re-fetch needed
        this.assets = [
          { id: result.id, type, title, created_at: new Date().toISOString(), _new: true },
          ...this.assets,
        ];
        return true;
      } catch (e) {
        if (e?.code === "ERR_CANCELED" || e?.message === "canceled") {
          return false;
        }
        throw e;
      } finally {
        this.loading.tool = false;
        this.isGenerating = false;
        this.generatingToolType = null;
        this.toolAbortController = null;
      }
    },

    async pinMessage(message) {
      if (!this.notebook || !message?.content) return;
      await ToolsAPI.saveNote({
        notebookId: this.notebook.id,
        content: message.content,
      });
      await this.fetchAssets(this.notebook.id);
    },

    async removeAsset(id) {
      await ToolsAPI.remove(id);
      this.assets = this.assets.filter((a) => a.id !== id);
    },

    async renameAsset(id, title) {
      await ToolsAPI.rename(id, title);
      this.assets = this.assets.map((a) => a.id === id ? { ...a, title } : a);
    },
  },
});

const STAGE_LABELS = {
  retrieving_store: "Connecting to vector store",
  building_queries: "Building search queries",
  searching_documents: "Searching documents",
  reranking: "Reranking candidates",
  generating_answer: "Generating answer",
  extracting_sources: "Extracting sources",
  no_results: "No matching passages",
  done: "Done",
  error: "Error",
};