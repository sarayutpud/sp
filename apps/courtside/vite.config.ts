import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  envDir: resolve(__dirname, "../.."),
  resolve: {
    alias: {
      "@sp/rules-engine": resolve(
        __dirname,
        "../../packages/rules-engine/src/index.ts",
      ),
      "@sp/shared-types": resolve(
        __dirname,
        "../../packages/shared-types/src/index.ts",
      ),
      "@sp/sync-protocol": resolve(
        __dirname,
        "../../packages/sync-protocol/src/index.ts",
      ),
      "@sp/ui": resolve(__dirname, "../../packages/ui/src/index.ts"),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
});
