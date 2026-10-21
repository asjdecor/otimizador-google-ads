// Abre o app em modo de demonstração (conta de exemplo), num banco separado (prisma/demo.db).
//   npm run demo           → IA falsa (não gasta créditos)
//   npm run demo:ia-real   → IA de verdade (usa ANTHROPIC_API_KEY do .env e gasta créditos)
import { spawn, spawnSync } from "node:child_process";

const iaReal = process.argv.includes("--ia-real");
const ambiente = {
  ...process.env,
  APP_DADOS_FALSOS: "1",
  DATABASE_URL: "file:./demo.db",
  ...(iaReal ? { APP_DEMO_IA_REAL: "1" } : {}),
};

const migracao = spawnSync("npx", ["prisma", "migrate", "deploy"], { env: ambiente, stdio: "inherit", shell: true });
if (migracao.status !== 0) process.exit(migracao.status ?? 1);

console.log(`\nModo de demonstração (${iaReal ? "IA REAL: gasta créditos da Anthropic" : "IA falsa"}): abra http://localhost:3000 (Ctrl+C para parar)\n`);
const servidor = spawn("npx", ["next", "dev"], { env: ambiente, stdio: "inherit", shell: true });
servidor.on("exit", (codigo) => process.exit(codigo ?? 0));
