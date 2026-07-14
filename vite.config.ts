import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        secure: false,
        timeout: 60_000,
        configure: (proxy) => {
          proxy.on("error", (err, _req, res) => {
            console.error("[vite proxy /api]", err.message);
            if (res && "writeHead" in res && typeof res.writeHead === "function") {
              res.writeHead(502, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: {
                    code: "NETWORK_ERROR",
                    message: "BFF 未启动或代理失败，请运行 npm run dev:all。",
                  },
                }),
              );
            }
          });
        },
      },
    },
    watch: {
      ignored: ["**/.phoneverse-ai-key", "**/.env", "**/.env.*", "**/personas/**"],
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    clearMocks: true,
  },
});
