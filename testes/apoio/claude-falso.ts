import type { GeradorDeTexto } from "@/api/integracoes/claude/cliente";

export interface RespostaFalsa {
  titulos: string[];
  descricoes: string[];
}

/** Claude falso: devolve as respostas da lista em ordem (repete a última) e guarda as mensagens recebidas. */
export function criarGeradorFalso(respostas: RespostaFalsa[], modelo = "claude-opus-5-5") {
  const mensagens: string[] = [];
  const sistemas: string[] = [];
  const gerador: GeradorDeTexto = {
    async gerarJson<T>(pedido: { sistema: string; mensagem: string; esquema: { parse(valor: unknown): T } }) {
      mensagens.push(pedido.mensagem);
      sistemas.push(pedido.sistema);
      const resposta = respostas[Math.min(mensagens.length - 1, respostas.length - 1)];
      return { dados: pedido.esquema.parse(resposta), modelo, tokensEntrada: 1000, tokensSaida: 500 };
    },
  };
  return { gerador, mensagens, sistemas };
}

export const tituloDeTamanho = (n: number, marca = "T") => `${marca}${"x".repeat(Math.max(0, n - marca.length))}`;
