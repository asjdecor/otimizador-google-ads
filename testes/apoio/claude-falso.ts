import type { GeradorDeTexto, PedidoDePesquisa, PedidoJson } from "@/api/integracoes/claude/cliente";

export interface RespostaFalsa {
  titulos: string[];
  descricoes: string[];
}

/**
 * Claude falso: devolve as respostas da lista em ordem (repete a última) e guarda as mensagens recebidas.
 * `pesquisarNaWeb` usa a mesma lista e guarda os pedidos de pesquisa (com os limites) em `pesquisas`;
 * os pedidos de `gerarJson` ficam em `pedidosJson`.
 */
export function criarGeradorFalso(respostas: unknown[], modelo = "claude-opus-5-5") {
  const mensagens: string[] = [];
  const sistemas: string[] = [];
  const pesquisas: PedidoDePesquisa<unknown>[] = [];
  const pedidosJson: PedidoJson<unknown>[] = [];
  const proximaResposta = () => respostas[Math.min(mensagens.length - 1, respostas.length - 1)];
  const gerador: GeradorDeTexto = {
    async gerarJson(pedido) {
      mensagens.push(pedido.mensagem);
      pedidosJson.push(pedido);
      sistemas.push(pedido.sistema);
      return { dados: pedido.esquema.parse(proximaResposta()), modelo, tokensEntrada: 1000, tokensSaida: 500 };
    },
    async pesquisarNaWeb(pedido) {
      mensagens.push(pedido.mensagem);
      sistemas.push(pedido.sistema);
      pesquisas.push(pedido);
      return { dados: pedido.esquema.parse(proximaResposta()), modelo, tokensEntrada: 1000, tokensSaida: 500, buscasNaWeb: 3 };
    },
  };
  return { gerador, mensagens, sistemas, pesquisas, pedidosJson };
}

export const tituloDeTamanho = (n: number, marca = "T") => `${marca}${"x".repeat(Math.max(0, n - marca.length))}`;
