import { PrismaClient } from "@prisma/client";

const globalComPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Instância única do Prisma (evita várias conexões no hot reload do Next). */
export const prisma: PrismaClient = globalComPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalComPrisma.prisma = prisma;
}
