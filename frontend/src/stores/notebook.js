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
      this.error = "";
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
        // Default: all docs selected for RAG
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
        id: `tmp-${Date.now()}`,
        role: "user",
        content: text,
        sources: [],
      };
      this.messages = [...this.messages, optimistic];
      this.loading.chat = true;
      try {
        const res = await ChatAPI.ask(
          this.notebook.id,
          text,
          this.activeDocIds.length ? this.activeDocIds : null
        );
        this.messages = [...this.messages, res];
      } catch (e) {
        this.messages = [
          ...this.messages,
          { id: `err-${Date.now()}`, role: "assistant", content: `⚠️ ${e.message}`, sources: [] },
        ];
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
