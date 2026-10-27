import { NextResponse } from "next/server";
import { carregarContextoDaConta } from "@/api/http/contexto-da-conta";
import { barrarOutraOrigem, responderErro, responderErroExterno } from "@/api/http/respostas";
import { iaConfiguradaNoAmbiente } from "@/api/integracoes/fabrica";
import { iniciarPesquisa, montarPontoDePartida } from "@/api/servicos/pesquisa-de-mercado";

/** Só consulta o Google e grava o ponto de partida; a IA roda nas etapas seguintes. */
export const maxDuration = 30;

/** Pesquisa de mercado: começa uma pesquisa nova para a conta escolhida. */
export async function POST(requisicao: Request) {
  const bloqueio = barrarOutraOrigem(requisicao);
  if (bloqueio) return bloqueio;
  if (!iaConfiguradaNoAmbiente()) return responderErro("Preencha ANTHROPIC_API_KEY no .env para pesquisar.");

  const conta = await carregarContextoDaConta();
  if (conta.tipo !== "pronto") return responderErro(conta.tipo === "erro" ? conta.mensagem : "Conecte e escolha uma conta.");
  try {
    const ponto = await montarPontoDePartida(conta);
    const pesquisa = await iniciarPesquisa(conta.conta.customerId, ponto);
    return NextResponse.json({ pesquisa });
  } catch (erro) {
    return responderErroExterno(erro);
  }
}
