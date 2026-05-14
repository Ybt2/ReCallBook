import api from "./http";

export const UserAPI = {
  getModels: () => api.get("/user/models").then((r) => r.data),
  setModels: (data) => api.put("/user/models", data).then((r) => r.data),
};
