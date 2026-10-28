export const itensDoMenu = [
  { href: "/painel", rotulo: "Painel", icone: "▦" },
  { href: "/anuncios", rotulo: "Anúncios", icone: "✎" },
  { href: "/palavras-chave", rotulo: "Palavras-chave", icone: "#" },
  { href: "/pesquisa", rotulo: "Pesquisa", icone: "⌕" },
] as const;

/** Diz se o item do menu corresponde à rota atual. */
export function itemEstaAtivo(hrefDoItem: string, rotaAtual: string): boolean {
  return rotaAtual === hrefDoItem || rotaAtual.startsWith(`${hrefDoItem}/`);
}
