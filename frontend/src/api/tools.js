import api from "./http";

export const ToolsAPI = {
  list: (notebookId) =>
    api.get("/tools", { params: { notebookId } }).then((r) => r.data),
  get: (id) => api.get(`/tools/${id}`).then((r) => r.data),
  remove: (id) => api.delete(`/tools/${id}`).then((r) => r.data),
  generateQuiz: ({ notebookId, docIds, prompt, numQuestions, difficulty }) =>
    api
      .post("/tools/quiz", { notebookId, docIds, prompt, numQuestions, difficulty })
      .then((r) => r.data),
  generateFlashcards: ({ notebookId, docIds, prompt, numCards, difficulty }) =>
    api
      .post("/tools/flashcards", { notebookId, docIds, prompt, numCards, difficulty })
      .then((r) => r.data),
};
