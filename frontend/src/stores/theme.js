import { defineStore } from "pinia";

const LS_KEY = "recallbook.theme";

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applyTheme(mode) {
  const resolved = mode === "system" ? getSystemTheme() : mode;
  const root = document.documentElement;
  if (resolved === "light") {
    root.classList.add("light");
  } else {
    root.classList.remove("light");
  }
}

export const useThemeStore = defineStore("theme", {
  state: () => ({
    mode: localStorage.getItem(LS_KEY) || "dark",
  }),
  getters: {
    resolvedTheme: (s) =>
      s.mode === "system" ? getSystemTheme() : s.mode,
  },
  actions: {
    setMode(value) {
      this.mode = value;
      localStorage.setItem(LS_KEY, value);
      applyTheme(value);
    },
    init() {
      applyTheme(this.mode);
      if (this.mode === "system") {
        window
          .matchMedia("(prefers-color-scheme: light)")
          .addEventListener("change", () => {
            if (this.mode === "system") applyTheme("system");
          });
      }
    },
  },
});