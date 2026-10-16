import { NextResponse } from "next/server";
import { z } from "zod";
import { lerConfiguracaoClaude } from "@/api/configuracao/ambiente";
import { carregarContextoDaConta } from "@/api/http/contexto-da-conta";
import { barrarOutraOrigem, responderErro, responderErroExterno } from "@/api/http/respostas";
import { criarGeradorClaude } from "@/api/integracoes/claude/cliente";
import { gerarESalvarSugestoesDoAnuncio, TAMANHO_MAXIMO_DO_CONTEXTO } from "@/api/servicos/sugestoes";

/** Vercel: chamadas ao Google/IA podem levar dezenas de segundos. */
export const maxDuration = 60;

const esquemaCorpo = z.object({
  anuncioId: z.string().regex(/^\d+~\d+$/),
  contexto: z.string().max(TAMANHO_MAXIMO_DO_CONTEXTO).optional(),
});

/** F4 — gera títulos e descrições com o Claude para um anúncio e guarda no histórico. */
export async function POST(requisicao: Request) {
  const bloqueio = barrarOutraOrigem(requisicao);
  if (bloqueio) return bloqueio;
  const corpo = esquemaCorpo.safeParse(await requisicao.json().catch(() => null));
  if (!corpo.success) return responderErro(`Contexto deve ter até ${TAMANHO_MAXIMO_DO_CONTEXTO} caracteres.`);

  const conta = await carregarContextoDaConta();
  if (conta.tipo !== "pronto") return responderErro(conta.tipo === "erro" ? conta.mensagem : "Conecte e escolha uma conta.");
  try {
    const resultado = await gerarESalvarSugestoesDoAnuncio({
      anuncioId: corpo.data.anuncioId,
      contextoUsuario: corpo.data.contexto?.trim() || null,
      gerador: criarGeradorClaude(lerConfiguracaoClaude()),
      conta,
    });
    return resultado ? NextResponse.json(resultado) : responderErro("Anúncio não encontrado nesta conta.", 404);
  } catch (erro) {
    return responderErroExterno(erro);
  }
}
