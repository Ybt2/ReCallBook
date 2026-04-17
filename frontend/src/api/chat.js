import api from "./http";

export const ChatAPI = {
  messages: (notebookId) =>
    api.get("/chat/messages", { params: { notebookId } }).then((r) => r.data),
  ask: (notebookId, mensagem, docIds) =>
    api.post("/chat/pergunta", { notebookId, mensagem, docIds }).then((r) => r.data),
};
