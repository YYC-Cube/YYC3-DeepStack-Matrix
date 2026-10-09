import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // YYC³ 团队规范: 开发服务器端口从 3030 起
    port: 3030,
    host: true,
    strictPort: false,
  },
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 4096,
  },
});
