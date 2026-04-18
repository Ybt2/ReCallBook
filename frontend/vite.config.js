import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      "/api/chat/stream": {
        target: "http://localhost:3000",
        changeOrigin: true,
        selfHandleResponse: true,
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes, _req, res) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
          });
        },
      },
      "/api/ollama/pull": {
        target: "http://localhost:3000",
        changeOrigin: true,
        selfHandleResponse: true,
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes, _req, res) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
          });
        },
      },
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});