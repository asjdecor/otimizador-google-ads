import { NextResponse } from "next/server";
import { z } from "zod";
import { ErroParaUsuario } from "@/api/erro-para-usuario";
import { carregarContextoDaConta } from "@/api/http/contexto-da-conta";
import { barrarOutraOrigem, responderErro, responderErroExterno } from "@/api/http/respostas";
import { criarGeradorDoAmbiente, iaConfiguradaNoAmbiente } from "@/api/integracoes/fabrica";
import { ETAPAS } from "@/api/servicos/esquema-pesquisa-de-mercado";
import { executarEtapa, lerPesquisa } from "@/api/servicos/pesquisa-de-mercado";

/** Cada etapa pode pesquisar na web e consultar o Google; é a chamada mais longa do app. */
export const maxDuration = 300;

const esquemaCorpo = z.object({ etapa: z.enum(ETAPAS) });

/** Pesquisa de mercado: roda a etapa atual da pesquisa. */
export async function POST(requisicao: Request, { params }: { params: Promise<{ id: string }> }) {
  const bloqueio = barrarOutraOrigem(requisicao);
  if (bloqueio) return bloqueio;
  const corpo = esquemaCorpo.safeParse(await requisicao.json().catch(() => null));
  if (!corpo.success) return responderErro("Etapa inválida.");
  if (!iaConfiguradaNoAmbiente()) return responderErro("Preencha ANTHROPIC_API_KEY no .env para pesquisar.");

  const conta = await carregarContextoDaConta();
  if (conta.tipo !== "pronto") return responderErro(conta.tipo === "erro" ? conta.mensagem : "Conecte e escolha uma conta.");
  const { id } = await params;
  try {
    if (!(await lerPesquisa(id, conta.conta.customerId))) return responderErro("Pesquisa não encontrada.", 404);
    const pesquisa = await executarEtapa(
      { gerador: criarGeradorDoAmbiente(), api: conta.api, credenciais: conta.credenciais },
      id,
      corpo.data.etapa,
    );
    return NextResponse.json({ pesquisa });
  } catch (erro) {
    if (erro instanceof ErroParaUsuario) return responderErro(erro.message, 409);
    return responderErroExterno(erro);
  }
}
