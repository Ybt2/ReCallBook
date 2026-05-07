import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem("recallbook.user");
  const token = localStorage.getItem("recallbook.token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("recallbook.user");
      localStorage.removeItem("recallbook.token");
      window.location.href = "/login";
      return Promise.reject(new Error("Session expired."));
    }
    const msg =
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      "Request failed";
    return Promise.reject(new Error(msg));
  }
);

export default api;
