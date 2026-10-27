import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/api/banco/prisma";
import { ErroParaUsuario } from "@/api/erro-para-usuario";

export interface ConfiguracaoDoApp {
  limiteDesperdicio: number;
  periodoPadrao: number;
  orcamentoMaximoPorCampanha: number | null;
  orcamentoMaximoTotal: number | null;
}

const PARSE_REAL = (valorCentavos: number | null): number | null => (valorCentavos === null ? null : valorCentavos / 100);

/** Linha única (id = 1); criada com os padrões do schema na primeira leitura. */
export async function lerConfiguracaoDoApp(banco: PrismaClient = prisma): Promise<ConfiguracaoDoApp> {
  const { limiteDesperdicio, periodoPadrao, orcamentoMaximoPorCampanhaCentavos, orcamentoMaximoTotalCentavos } = await banco.configuracao.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
  return {
    limiteDesperdicio,
    periodoPadrao,
    orcamentoMaximoPorCampanha: PARSE_REAL(orcamentoMaximoPorCampanhaCentavos),
    orcamentoMaximoTotal: PARSE_REAL(orcamentoMaximoTotalCentavos),
  };
}

export const LIMITE_DESPERDICIO_MAXIMO = 1_000_000;
const ORCAMENTO_MAXIMO_TOTAL = 10_000_000;

function validarValorEmReais(valor: number, nome: string, maximo: number): void {
  if (!Number.isInteger(valor) || valor < 0 || valor > maximo) {
    throw new ErroParaUsuario(`Informe um valor inteiro em reais para ${nome}, de 0 a ${maximo.toLocaleString("pt-BR")}.`);
  }
}

export async function salvarLimiteDeDesperdicio(valorEmReais: number, banco: PrismaClient = prisma): Promise<void> {
  validarValorEmReais(valorEmReais, "o limite de desperdício", LIMITE_DESPERDICIO_MAXIMO);
  await banco.configuracao.upsert({
    where: { id: 1 },
    create: { id: 1, limiteDesperdicio: valorEmReais },
    update: { limiteDesperdicio: valorEmReais },
  });
}

export async function salvarOrcamentoMaximoPorCampanha(valorEmReais: number | null, banco: PrismaClient = prisma): Promise<void> {
  if (valorEmReais === null) {
    await banco.configuracao.upsert({
      where: { id: 1 },
      create: { id: 1, orcamentoMaximoPorCampanhaCentavos: null },
      update: { orcamentoMaximoPorCampanhaCentavos: null },
    });
    return;
  }
  validarValorEmReais(valorEmReais, "o orçamento máximo por campanha", ORCAMENTO_MAXIMO_TOTAL);
  await banco.configuracao.upsert({
    where: { id: 1 },
    create: { id: 1, orcamentoMaximoPorCampanhaCentavos: Math.round(valorEmReais * 100) },
    update: { orcamentoMaximoPorCampanhaCentavos: Math.round(valorEmReais * 100) },
  });
}

export async function salvarOrcamentoMaximoTotal(valorEmReais: number | null, banco: PrismaClient = prisma): Promise<void> {
  if (valorEmReais === null) {
    await banco.configuracao.upsert({
      where: { id: 1 },
      create: { id: 1, orcamentoMaximoTotalCentavos: null },
      update: { orcamentoMaximoTotalCentavos: null },
    });
    return;
  }
  validarValorEmReais(valorEmReais, "o orçamento máximo total", ORCAMENTO_MAXIMO_TOTAL);
  await banco.configuracao.upsert({
    where: { id: 1 },
    create: { id: 1, orcamentoMaximoTotalCentavos: Math.round(valorEmReais * 100) },
    update: { orcamentoMaximoTotalCentavos: Math.round(valorEmReais * 100) },
  });
}
