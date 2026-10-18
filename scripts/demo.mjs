// Abre o app em modo de demonstração (conta de exemplo + IA falsa), num banco separado (prisma/demo.db).
//   npm run demo
import { spawn, spawnSync } from "node:child_process";

const ambiente = { ...process.env, APP_DADOS_FALSOS: "1", DATABASE_URL: "file:./demo.db" };

const migracao = spawnSync("npx", ["prisma", "migrate", "deploy"], { env: ambiente, stdio: "inherit", shell: true });
if (migracao.status !== 0) process.exit(migracao.status ?? 1);

console.log("\nModo de demonstração: abra http://localhost:3000 (Ctrl+C para parar)\n");
const servidor = spawn("npx", ["next", "dev"], { env: ambiente, stdio: "inherit", shell: true });
servidor.on("exit", (codigo) => process.exit(codigo ?? 0));
