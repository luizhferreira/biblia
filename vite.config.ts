import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  // Servido a partir da raiz do domínio (Cloudflare / domínio próprio). URLs de
  // capítulo aninhadas (`/joao/3`) exigem base absoluta: com base relativa os
  // assets quebrariam a partir de uma subpasta. Ver scripts/prerender.ts.
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    open: false,
  },
});