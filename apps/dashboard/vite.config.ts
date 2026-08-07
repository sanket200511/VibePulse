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
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", () => {
            /* API offline — swallow ECONNREFUSED */
          });
        },
      },
      "/sessions": {
        target: "http://localhost:8080",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", () => {
            /* API offline — swallow ECONNREFUSED */
          });
        },
      },
      "/events": {
        target: "http://localhost:8080",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", () => {
            /* API offline — swallow ECONNREFUSED */
          });
        },
      },
      "/projects": {
        target: "http://localhost:8080",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", () => {
            /* API offline — swallow ECONNREFUSED */
          });
        },
      },
      "/investigation": {
        target: "http://localhost:8080",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", () => {
            /* API offline — swallow ECONNREFUSED */
          });
        },
      },
      "/health": {
        target: "http://localhost:8080",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", () => {
            /* API offline — swallow ECONNREFUSED */
          });
        },
      },
      "/ws": {
        target: "ws://localhost:8080",
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", () => {
            /* API offline — swallow ECONNREFUSED */
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
