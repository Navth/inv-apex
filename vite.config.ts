import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const CWD = process.cwd();

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(CWD, "client", "src"),
      "@shared": path.resolve(CWD, "shared"),
      "@assets": path.resolve(CWD, "attached_assets"),
    },
  },
  root: path.resolve(CWD, "client"),
  // Load env from project root so both client and server share the same .env file
  envDir: path.resolve(CWD),
  build: {
    // Output directly into server/public so the Express server can serve static assets in production
    outDir: path.resolve(CWD, "server/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
