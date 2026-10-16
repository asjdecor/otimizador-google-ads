// Gera prisma/postgres/schema.prisma a partir de prisma/schema.prisma (SQLite).
// Local e testes usam SQLite; a Vercel usa PostgreSQL (Neon). Os modelos são os mesmos.
//   node scripts/gerar-schema-postgres.mjs              → escreve o arquivo
//   node scripts/gerar-schema-postgres.mjs --verificar  → falha se estiver desatualizado
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const ORIGEM = "prisma/schema.prisma";
const DESTINO = "prisma/postgres/schema.prisma";

const DATASOURCE_SQLITE = /datasource db \{[^}]*\}/;
const DATASOURCE_POSTGRES = `datasource db {
  provider  = "postgresql"
  // A integração Neon da Vercel cria as duas variáveis: com pool (app) e direta (migrations).
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_UNPOOLED")
}`;

export function gerarSchemaPostgres(schemaSqlite) {
  if (!DATASOURCE_SQLITE.test(schemaSqlite)) throw new Error("datasource não encontrado em " + ORIGEM);
  return (
    "// ARQUIVO GERADO por scripts/gerar-schema-postgres.mjs — edite prisma/schema.prisma.\n\n" +
    schemaSqlite.replace(DATASOURCE_SQLITE, DATASOURCE_POSTGRES)
  );
}

const esperado = gerarSchemaPostgres(readFileSync(ORIGEM, "utf8").replace(/\r\n/g, "\n"));

if (process.argv.includes("--verificar")) {
  const atual = existsSync(DESTINO) ? readFileSync(DESTINO, "utf8").replace(/\r\n/g, "\n") : "";
  if (atual !== esperado) {
    console.error(`${DESTINO} está desatualizado. Rode: node scripts/gerar-schema-postgres.mjs`);
    process.exit(1);
  }
  console.log(`${DESTINO} está em dia.`);
} else {
  mkdirSync("prisma/postgres", { recursive: true });
  writeFileSync(DESTINO, esperado);
  console.log(`Gerado ${DESTINO}`);
}
