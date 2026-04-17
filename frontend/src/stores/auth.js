import { defineStore } from "pinia";
import { AuthAPI } from "../api/auth";

const LS_KEY = "recallbook.user";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: JSON.parse(localStorage.getItem(LS_KEY) || "null"),
    loading: false,
    error: "",
  }),
  getters: {
    isAuthenticated: (s) => !!s.user?.id,
  },
  actions: {
    _persist() {
      if (this.user) localStorage.setItem(LS_KEY, JSON.stringify(this.user));
      else localStorage.removeItem(LS_KEY);
    },
    async login(email, password) {
      this.loading = true;
      this.error = "";
      try {
        const res = await AuthAPI.login(email, password);
        this.user = res.user;
        this._persist();
        return true;
      } catch (e) {
        this.error = e.message;
        return false;
      } finally {
        this.loading = false;
      }
    },
    async register(username, email, password) {
      this.loading = true;
      this.error = "";
      try {
        const res = await AuthAPI.register(username, email, password);
        this.user = res.user;
        this._persist();
        return true;
      } catch (e) {
        this.error = e.message;
        return false;
      } finally {
        this.loading = false;
      }
    },
    logout() {
      this.user = null;
      this._persist();
    },
  },
});
