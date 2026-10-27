import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const modelos = (schema: string) => [...schema.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]).sort();

describe("schema PostgreSQL (Vercel) gerado a partir do SQLite", () => {
  it("está em dia com prisma/schema.prisma", () => {
    expect(() => execFileSync("node", ["scripts/gerar-schema-postgres.mjs", "--verificar"], { stdio: "pipe" })).not.toThrow();
  });

  it("tem os mesmos modelos, só troca o banco", () => {
    const sqlite = readFileSync("prisma/schema.prisma", "utf8");
    const postgres = readFileSync("prisma/postgres/schema.prisma", "utf8");
    expect(modelos(postgres)).toEqual(modelos(sqlite));
    expect(postgres).toContain('provider  = "postgresql"');
    expect(postgres).toContain('directUrl = env("DATABASE_URL_UNPOOLED")');
    expect(postgres).not.toContain('"sqlite"');
  });

  it("as migrations do Postgres criam todas as tabelas", () => {
    const pasta = "prisma/postgres/migrations";
    const sql = readdirSync(pasta, { withFileTypes: true })
      .filter((item) => item.isDirectory())
      .map((item) => readFileSync(`${pasta}/${item.name}/migration.sql`, "utf8"))
      .join("\n");
    for (const modelo of modelos(readFileSync("prisma/schema.prisma", "utf8"))) {
      expect(sql).toContain(`CREATE TABLE "${modelo}"`);
    }
  });
});
