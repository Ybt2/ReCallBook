import { defineStore } from "pinia";

let seed = 0;

export const useToastStore = defineStore("toast", {
  state: () => ({ items: [] }),
  actions: {
    push(message, type = "info", timeout = 3500) {
      const id = ++seed;
      this.items.push({ id, message, type });
      setTimeout(() => this.dismiss(id), timeout);
    },
    success(m) { this.push(m, "success"); },
    error(m) { this.push(m, "error", 5000); },
    dismiss(id) {
      this.items = this.items.filter((t) => t.id !== id);
    },
  },
});
