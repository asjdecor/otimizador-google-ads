import { z } from "zod";
import type { ApiGoogleAds } from "./api-google-ads";

export interface ContaAcessivel {
  customerId: string;
  nome: string;
  moeda: string;
  ehGerente: boolean;
  loginCustomerId: string | null;
}

/** Todas as contas ativas da hierarquia (a própria conta vem como nível 0). */
export const GAQL_CONTAS_DA_HIERARQUIA = `
SELECT
  customer_client.id,
  customer_client.descriptive_name,
  customer_client.currency_code,
  customer_client.manager,
  customer_client.level
FROM customer_client
WHERE customer_client.status = 'ENABLED'`;

const esquemaLinhaCustomerClient = z.object({
  customer_client: z.object({
    id: z.union([z.number(), z.string()]).transform(String),
    descriptive_name: z.string().nullish(),
    currency_code: z.string().nullish(),
    manager: z.boolean().nullish(),
  }),
});

/**
 * Lista as contas que o usuário consegue ler: as acessíveis direto e as filhas de cada MCC.
 * Conta acessível direto usa ela mesma como login; filha usa a MCC pela qual foi encontrada.
 * Conta encontrada sob a `mccPreferida` usa essa MCC como login, mesmo que também seja acessível direto.
 * Se uma conta raiz falhar, ela é ignorada; se TODAS falharem, o último erro é lançado.
 */
export async function listarContasAcessiveis(
  api: ApiGoogleAds,
  refreshToken: string,
  mccPreferida: string | null = null,
): Promise<ContaAcessivel[]> {
  const idsRaiz = await api.listarIdsAcessiveis(refreshToken);
  const raizes = new Set(idsRaiz);
  const contas = new Map<string, ContaAcessivel>();
  let ultimoErro: unknown = null;
  let algumaRaizFuncionou = false;

  for (const idRaiz of idsRaiz) {
    let linhas: unknown[];
    try {
      linhas = await api.consultar({ customerId: idRaiz, loginCustomerId: idRaiz, refreshToken }, GAQL_CONTAS_DA_HIERARQUIA);
    } catch (erro) {
      ultimoErro = erro;
      continue;
    }
    algumaRaizFuncionou = true;

    for (const linha of linhas) {
      const resultado = esquemaLinhaCustomerClient.safeParse(linha);
      if (!resultado.success) continue;
      const cliente = resultado.data.customer_client;
      const viaMccPreferida = idRaiz === mccPreferida && cliente.id !== idRaiz;
      if (contas.has(cliente.id) && !viaMccPreferida) continue;
      contas.set(cliente.id, {
        customerId: cliente.id,
        nome: cliente.descriptive_name?.trim() || `Conta ${cliente.id}`,
        moeda: cliente.currency_code ?? "",
        ehGerente: cliente.manager ?? false,
        loginCustomerId: viaMccPreferida || !raizes.has(cliente.id) ? idRaiz : cliente.id,
      });
    }
  }

  if (!algumaRaizFuncionou && ultimoErro !== null) {
    throw ultimoErro;
  }
  return [...contas.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
