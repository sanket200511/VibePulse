import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: Number(process.env.VIBEPULSE_DASHBOARD_PORT || process.env.DASHBOARD_PORT || 5134),
    proxy: {
      "/api": {
        target: process.env.VIBEPULSE_API_URL || process.env.VITE_API_URL || "http://localhost:5133",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res) => {
            if (res && "writeHead" in res && !res.headersSent) {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Backend API offline" }));
            }
          });
        },
      },
      "/sessions": {
        target: process.env.VIBEPULSE_API_URL || process.env.VITE_API_URL || "http://localhost:5133",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res) => {
            if (res && "writeHead" in res && !res.headersSent) {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Backend API offline" }));
            }
          });
        },
      },
      "/events": {
        target: process.env.VIBEPULSE_API_URL || process.env.VITE_API_URL || "http://localhost:5133",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res) => {
            if (res && "writeHead" in res && !res.headersSent) {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Backend API offline" }));
            }
          });
        },
      },
      "/investigation/search": {
        target: process.env.VIBEPULSE_API_URL || process.env.VITE_API_URL || "http://localhost:5133",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res) => {
            if (res && "writeHead" in res && !res.headersSent) {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Backend API offline" }));
            }
          });
        },
      },
      "^/projects/[^/]+/investigation/search": {
        target: process.env.VIBEPULSE_API_URL || process.env.VITE_API_URL || "http://localhost:5133",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res) => {
            if (res && "writeHead" in res && !res.headersSent) {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Backend API offline" }));
            }
          });
        },
      },
      "/health": {
        target: process.env.VIBEPULSE_API_URL || process.env.VITE_API_URL || "http://localhost:5133",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res) => {
            if (res && "writeHead" in res && !res.headersSent) {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Backend API offline" }));
            }
          });
        },
      },
      "/ws": {
        target: (process.env.VIBEPULSE_API_URL || process.env.VITE_API_URL || "http://localhost:5133").replace(
          /^http/,
          "ws",
        ),
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", () => {
            /* WS API offline — swallow connection reset */
          });
        },
      },
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          router: ["react-router-dom"],
          query: ["@tanstack/react-query"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: false,
  },
});
