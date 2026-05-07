import { defineStore } from "pinia";
import { AuthAPI } from "../api/auth";

const LS_KEY = "recallbook.user";
const TOKEN_KEY = "recallbook.token";

export const SUPPORTED_LANGUAGES = [
  { value: "English", label: "English" },
  { value: "Portuguese", label: "Português" },
  { value: "Spanish", label: "Español" },
  { value: "French", label: "Français" },
  { value: "German", label: "Deutsch" },
  { value: "Italian", label: "Italiano" },
  { value: "Chinese", label: "中文" },
  { value: "Japanese", label: "日本語" },
  { value: "Korean", label: "한국어" },
  { value: "Dutch", label: "Nederlands" },
  { value: "Polish", label: "Polski" },
  { value: "Russian", label: "Русский" },
  { value: "Arabic", label: "العربية" },
  { value: "Hindi", label: "हिन्दी" },
];

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: JSON.parse(localStorage.getItem(LS_KEY) || "null"),
    token: localStorage.getItem(TOKEN_KEY) || null,
    loading: false,
    error: "",
  }),
  getters: {
    isAuthenticated: (s) => !!s.user?.id && !!s.token,
    userLanguage: (s) => s.user?.language || "English",
  },
  actions: {
    _persist() {
      if (this.user) localStorage.setItem(LS_KEY, JSON.stringify(this.user));
      else localStorage.removeItem(LS_KEY);
      if (this.token) localStorage.setItem(TOKEN_KEY, this.token);
      else localStorage.removeItem(TOKEN_KEY);
    },
    async login(email, password) {
      this.loading = true;
      this.error = "";
      try {
        const res = await AuthAPI.login(email, password);
        this.user = res.user;
        this.token = res.token;
        this._persist();
        return true;
      } catch (e) {
        this.error = e.message;
        return false;
      } finally {
        this.loading = false;
      }
    },
    async register(username, email, password, language = "English") {
      this.loading = true;
      this.error = "";
      try {
        const res = await AuthAPI.register(username, email, password, language);
        this.user = res.user;
        this.token = res.token;
        this._persist();
        return true;
      } catch (e) {
        this.error = e.message;
        return false;
      } finally {
        this.loading = false;
      }
    },
    async updateLanguage(language) {
      this.loading = true;
      this.error = "";
      try {
        await AuthAPI.updateProfile({ language });
        this.user = { ...this.user, language };
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
      this.token = null;
      this._persist();
    },
  },
});
