import { PrismaClient } from "@prisma/client";
import { urlDoBancoParaOAmbiente } from "@/api/configuracao/demonstracao";

const globalComPrisma = globalThis as unknown as { prisma?: PrismaClient };

function criarPrisma(): PrismaClient {
  const url = urlDoBancoParaOAmbiente();
  return url ? new PrismaClient({ datasourceUrl: url }) : new PrismaClient();
}

/** Instância única do Prisma (evita várias conexões no hot reload do Next). */
export const prisma: PrismaClient = globalComPrisma.prisma ?? criarPrisma();

if (process.env.NODE_ENV !== "production") {
  globalComPrisma.prisma = prisma;
}
