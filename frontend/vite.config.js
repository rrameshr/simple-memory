import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The React plugin enables the automatic JSX runtime (no "import React" needed in every file).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Local dev without Docker: forward /api to the backend so cookies stay same-origin.
    proxy: { "/api": { target: process.env.VITE_PROXY_TARGET || "http://localhost:5000", changeOrigin: false } }
  }
});
