import { randomBytes, scryptSync } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

/** Senha usada só no teste e2e (o hash é gerado a cada execução). */
export const SENHA_DO_TESTE_E2E = "senha-do-teste-e2e";
const salt = randomBytes(16);
const hash = scryptSync(SENHA_DO_TESTE_E2E, salt, 32, { N: 16384, r: 8, p: 1 });

const PORTA = 3999;

export default defineConfig({
  testDir: "testes/e2e",
  globalSetup: "./testes/e2e/preparar-banco-e2e.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    trace: "retain-on-failure",
    locale: "pt-BR",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev -p ${PORTA}`,
    url: `http://localhost:${PORTA}/login`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      // Google e Claude falsos (só funciona fora de produção) + banco próprio do e2e.
      APP_DADOS_FALSOS: "1",
      DATABASE_URL: "file:./e2e.db",
      ENCRYPTION_KEY: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
      APP_SENHA_HASH: `scrypt:${salt.toString("base64")}:${hash.toString("base64")}`,
      APP_SESSAO_SEGREDO: randomBytes(32).toString("base64url"),
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
