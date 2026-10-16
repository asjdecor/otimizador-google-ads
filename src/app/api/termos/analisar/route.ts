import { NextResponse } from "next/server";
import { z } from "zod";
import { lerConfiguracaoClaude } from "@/api/configuracao/ambiente";
import { carregarContextoDaConta } from "@/api/http/contexto-da-conta";
import { barrarOutraOrigem, responderErro, responderErroExterno } from "@/api/http/respostas";
import { criarGeradorClaude } from "@/api/integracoes/claude/cliente";
import { analisarTermosComIa, salvarAnaliseDeTermos } from "@/api/servicos/analise-de-termos";
import { carregarDadosDosTermos } from "@/api/servicos/dados-de-termos";
import { TAMANHO_MAXIMO_DO_CONTEXTO } from "@/api/servicos/limites-de-sugestao";

/** Vercel: chamadas ao Google/IA podem levar dezenas de segundos. */
export const maxDuration = 60;

const esquemaCorpo = z.object({ contexto: z.string().max(TAMANHO_MAXIMO_DO_CONTEXTO).optional() });

/** F5 (IA) — negativas irrelevantes e variações de palavras-chave a partir dos termos do período. */
export async function POST(requisicao: Request) {
  const bloqueio = barrarOutraOrigem(requisicao);
  if (bloqueio) return bloqueio;
  const corpo = esquemaCorpo.safeParse(await requisicao.json().catch(() => null));
  if (!corpo.success) return responderErro(`Contexto deve ter até ${TAMANHO_MAXIMO_DO_CONTEXTO} caracteres.`);

  const conta = await carregarContextoDaConta();
  if (conta.tipo !== "pronto") return responderErro(conta.tipo === "erro" ? conta.mensagem : "Conecte e escolha uma conta.");
  try {
    const { termos, palavrasPorGrupo } = await carregarDadosDosTermos(conta);
    const contextoUsuario = corpo.data.contexto?.trim() || null;
    const resultado = await analisarTermosComIa(criarGeradorClaude(lerConfiguracaoClaude()), {
      termos,
      palavrasPorGrupo,
      contextoUsuario: contextoUsuario ?? undefined,
    });
    const analise = await salvarAnaliseDeTermos({ customerId: conta.conta.customerId, contextoUsuario, resultado });
    return NextResponse.json({ analise });
  } catch (erro) {
    return responderErroExterno(erro);
  }
}
