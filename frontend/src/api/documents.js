import api from "./http";

export const DocumentsAPI = {
  list: (notebookId) =>
    api.get("/documents", { params: { notebookId } }).then((r) => r.data),
  upload: (notebookId, file, onProgress) => {
    const form = new FormData();
    form.append("notebookId", notebookId);
    form.append("file", file);
    return api
      .post("/documents/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: onProgress,
      })
      .then((r) => r.data);
  },
  remove: (id) => api.delete(`/documents/${id}`).then((r) => r.data),
  fileUrl: (id) => `/api/documents/${id}/file`,
};
