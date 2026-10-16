import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    include: ["testes/unidade/**/*.test.{ts,tsx}", "testes/integracao/**/*.test.{ts,tsx}"],
    environment: "node",
    globalSetup: ["testes/configuracao/preparar-banco-de-teste.ts"],
    // Banco de teste separado (prisma/teste.db) e chave fixa: nunca toca no banco real.
    env: {
      DATABASE_URL: "file:./teste.db",
      ENCRYPTION_KEY: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    },
    // Os testes de integração dividem o mesmo arquivo SQLite.
    fileParallelism: false,
  },
});
