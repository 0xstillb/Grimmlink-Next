import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: { outDir: "dist", sourcemap: false },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:6060", changeOrigin: true },
      "/health": { target: "http://127.0.0.1:6060", changeOrigin: true },
    },
  },
});
