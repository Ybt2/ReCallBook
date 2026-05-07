import api from "./http";

export const AuthAPI = {
  login: (email, password) =>
    api.post("/auth/login", { email, password }).then((r) => r.data),
  register: (username, email, password, language) =>
    api.post("/auth/register", { username, email, password, language }).then((r) => r.data),
  updateProfile: (data) =>
    api.put("/auth/profile", data).then((r) => r.data),
};
