import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  envDir: resolve(__dirname, "../.."),
  resolve: {
    alias: {
      "@sp/rules-engine": resolve(
        __dirname,
        "../../packages/rules-engine/src/index.ts",
      ),
      "@sp/report-export": resolve(
        __dirname,
        "../../packages/report-export/src/index.ts",
      ),
      "@sp/shared-types": resolve(
        __dirname,
        "../../packages/shared-types/src/index.ts",
      ),
      "@sp/ui": resolve(__dirname, "../../packages/ui/src/index.ts"),
    },
  },
  server: { port: 5173 },
});
