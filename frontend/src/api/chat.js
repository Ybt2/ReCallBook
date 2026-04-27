import api from "./http";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

function parseSseBlock(block) {
  const lines = block.split("\n");
  let event = "message";
  let data = "";
  for (const l of lines) {
    if (l.startsWith("event:")) event = l.slice(6).trim();
    else if (l.startsWith("data:")) data += l.slice(5).trim();
  }
  if (!data) return null;
  try { return { event, data: JSON.parse(data) }; } catch { return { event, data }; }
}

function getAuthHeaders() {
  const token = localStorage.getItem("recallbook.token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export const ChatAPI = {
  messages: (notebookId, { page = 1, limit = 50 } = {}) =>
    api.get("/chat/messages", { params: { notebookId, page, limit } }).then((r) => r.data),

  ask: (notebookId, mensagem, docIds, model) =>
    api
      .post("/chat/pergunta", { notebookId, mensagem, docIds, model })
      .then((r) => r.data),

  stream: async (payload, handlers = {}, signal) => {
    console.log("[ChatAPI.stream] Starting SSE request", payload);
    let res;
    try {
      res = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
        signal,
      });
    } catch (fetchErr) {
      console.error("[ChatAPI.stream] fetch() threw:", fetchErr);
      handlers.onError?.(fetchErr.message);
      return;
    }
    console.log("[ChatAPI.stream] Response status:", res.status, "ok:", res.ok, "body:", !!res.body);
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      console.error("[ChatAPI.stream] Bad response:", res.status, text);
      handlers.onError?.(`HTTP ${res.status}: ${text}`);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("[ChatAPI.stream] Stream ended");
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        console.log("[ChatAPI.stream] Raw chunk:", JSON.stringify(chunk));
        buf += chunk;
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const block of parts) {
          const ev = parseSseBlock(block);
          if (!ev) continue;
          console.log("[ChatAPI.stream] Parsed event:", ev.event, ev.data);
          if (ev.event === "user_saved") handlers.onUserSaved?.(ev.data);
          else if (ev.event === "stage") handlers.onStage?.(ev.data);
          else if (ev.event === "token") handlers.onToken?.(ev.data?.token || "");
          else if (ev.event === "done") handlers.onDone?.(ev.data);
          else if (ev.event === "error") handlers.onError?.(ev.data?.message || "stream failed");
        }
      }
    } catch (err) {
      console.error("[ChatAPI.stream] Read error:", err);
      if (err.name !== "AbortError") handlers.onError?.(err.message);
    }
  },
};
