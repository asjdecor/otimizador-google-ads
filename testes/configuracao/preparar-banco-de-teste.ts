import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

/** Recria prisma/teste.db do zero aplicando as migrations, antes de toda a suíte. */
export default function prepararBancoDeTeste() {
  rmSync("prisma/teste.db", { force: true });
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: "file:./teste.db" },
    stdio: "ignore",
  });
}
