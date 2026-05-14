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
  async fetchBlob(id) {
    const res = await api.get(`/documents/${id}/file`, { responseType: "blob" });
    return res.data;
  },
  async fetchObjectUrl(id) {
    const blob = await this.fetchBlob(id);
    return URL.createObjectURL(blob);
  },
  getDirectUrl(id) {
    return `${API_BASE_URL}/documents/${id}/file`;
  },
};