import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const API_TARGET = "http://localhost:8000";
const API_PATHS = [
  "/data", "/layout", "/health", "/settings",
  "/models", "/domains", "/members", "/sources",
  "/ai", "/pipeline", "/search", "/budget-status",
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "process.env": {},
  },
  server: {
    proxy: Object.fromEntries(
      API_PATHS.map((p) => [
        p,
        { target: API_TARGET, changeOrigin: true },
      ]),
    ),
  },
});
