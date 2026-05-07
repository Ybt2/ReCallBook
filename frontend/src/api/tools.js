import api from "./http";

export const ToolsAPI = {
  list: (notebookId) =>
    api.get("/tools", { params: { notebookId } }).then((r) => r.data),
  get: (id) => api.get(`/tools/${id}`).then((r) => r.data),
  remove: (id) => api.delete(`/tools/${id}`).then((r) => r.data),
  rename: (id, title) => api.patch(`/tools/${id}`, { title }).then((r) => r.data),
  saveNote: ({ notebookId, content, title }) =>
    api.post("/tools/note", { notebookId, content, title }).then((r) => r.data),
  generateQuiz: ({ notebookId, docIds, prompt, numQuestions, difficulty, model, signal }) =>
    api
      .post("/tools/quiz", { notebookId, docIds, prompt, numQuestions, difficulty, model }, { signal })
      .then((r) => r.data),
  generateFlashcards: ({ notebookId, docIds, prompt, numCards, difficulty, model, signal }) =>
    api
      .post("/tools/flashcards", { notebookId, docIds, prompt, numCards, difficulty, model }, { signal })
      .then((r) => r.data),
};