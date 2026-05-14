import api from "./http";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const DocumentsAPI = {
  list: (notebookId, { page = 1, limit = 100 } = {}) =>
    api.get("/documents", { params: { notebookId, page, limit } }).then((r) => r.data),
  upload: (notebookId, file, onProgress, visionModel) => {
    const form = new FormData();
    form.append("notebookId", notebookId);
    form.append("file", file);
    if (visionModel) form.append("visionModel", visionModel);
    return api
      .post("/documents/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: onProgress,
      })
      .then((r) => r.data);
  },
  remove: (id) => api.delete(`/documents/${id}`).then((r) => r.data),
  fileUrl: (id, page) => {
    const token = localStorage.getItem("recallbook.token");
    const qs = token ? `?token=${encodeURIComponent(token)}` : "";
    return page
      ? `${API_BASE_URL}/documents/${id}/file${qs}#page=${page}`
      : `${API_BASE_URL}/documents/${id}/file${qs}`;
  },
};