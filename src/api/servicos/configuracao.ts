import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/api/banco/prisma";
import { ErroParaUsuario } from "@/api/erro-para-usuario";

export interface ConfiguracaoDoApp {
  limiteDesperdicio: number;
  periodoPadrao: number;
}

/** Linha única (id = 1); criada com os padrões do schema na primeira leitura. */
export async function lerConfiguracaoDoApp(banco: PrismaClient = prisma): Promise<ConfiguracaoDoApp> {
  const { limiteDesperdicio, periodoPadrao } = await banco.configuracao.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
  return { limiteDesperdicio, periodoPadrao };
}

export const LIMITE_DESPERDICIO_MAXIMO = 1_000_000;

export async function salvarLimiteDeDesperdicio(valorEmReais: number, banco: PrismaClient = prisma): Promise<void> {
  if (!Number.isInteger(valorEmReais) || valorEmReais < 0 || valorEmReais > LIMITE_DESPERDICIO_MAXIMO) {
    throw new ErroParaUsuario("Informe um valor inteiro em reais, de 0 a 1.000.000.");
  }
  await banco.configuracao.upsert({
    where: { id: 1 },
    create: { id: 1, limiteDesperdicio: valorEmReais },
    update: { limiteDesperdicio: valorEmReais },
  });
}
