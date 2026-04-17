import { defineStore } from "pinia";
import { NotebooksAPI } from "../api/notebooks";
import { useAuthStore } from "./auth";

export const useNotebooksStore = defineStore("notebooks", {
  state: () => ({
    items: [],
    loading: false,
    error: "",
  }),
  actions: {
    async fetch() {
      const auth = useAuthStore();
      if (!auth.user) return;
      this.loading = true;
      this.error = "";
      try {
        this.items = await NotebooksAPI.list(auth.user.id);
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
    async create(titulo) {
      const auth = useAuthStore();
      const res = await NotebooksAPI.create(titulo, auth.user.id);
      await this.fetch();
      return res.notebook;
    },
    async remove(id) {
      await NotebooksAPI.remove(id);
      this.items = this.items.filter((n) => n.id !== id);
    },
  },
});
