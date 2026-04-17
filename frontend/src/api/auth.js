import api from "./http";

export const AuthAPI = {
  login: (email, password) =>
    api.post("/auth/login", { email, password }).then((r) => r.data),
  register: (username, email, password) =>
    api.post("/auth/register", { username, email, password }).then((r) => r.data),
};
