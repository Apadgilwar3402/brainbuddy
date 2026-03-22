import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/explain": "http://localhost:8000",
      "/conversations": "http://localhost:8000",
      "/video": "http://localhost:8000",
    },
  },
});
