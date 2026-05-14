import api from "./http";
import { parseSseBlock } from "./sse";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

function getAuthHeaders() {
  const token = localStorage.getItem("recallbook.token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export const OllamaAPI = {
  list: () => api.get("/ollama/models").then((r) => r.data.models || []),
  show: (model) => api.post("/ollama/show", { model }).then((r) => r.data),

  /**
   * Pull a model with SSE progress callbacks.
   * @param {string} name
   * @param {{ onProgress?: (p:{status,total,completed,percent,error})=>void,
   *           onDone?: ()=>void, onError?: (msg:string)=>void, signal?: AbortSignal }} opts
   */
  pull: async (name, opts = {}) => {
    const { onProgress, onDone, onError, signal } = opts;
    const res = await fetch(`${API_BASE_URL}/ollama/pull`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
      signal,
    });
    if (!res.ok || !res.body) {
      onError?.(`HTTP ${res.status}`);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const block of parts) {
          const ev = parseSseBlock(block);
          if (!ev) continue;
          if (ev.event === "progress") onProgress?.(ev.data);
          else if (ev.event === "done") onDone?.();
          else if (ev.event === "error") onError?.(ev.data?.message || "pull failed");
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") onError?.(err.message);
    }
  },
};


