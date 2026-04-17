import api from "./http";

export const NotebooksAPI = {
  list: (userId) => api.get("/notebooks", { params: { userId } }).then((r) => r.data),
  get: (id) => api.get(`/notebooks/${id}`).then((r) => r.data),
  create: (titulo, userId) =>
    api.post("/notebooks", { titulo, userId }).then((r) => r.data),
  remove: (id) => api.delete(`/notebooks/${id}`).then((r) => r.data),
};
