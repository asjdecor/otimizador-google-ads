import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

/** Recria prisma/e2e.db do zero antes do teste de ponta a ponta. */
export default function prepararBancoE2e() {
  rmSync("prisma/e2e.db", { force: true });
  rmSync("prisma/e2e.db-journal", { force: true });
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: "file:./e2e.db" }, stdio: "ignore" });
}
