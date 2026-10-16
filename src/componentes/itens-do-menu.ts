export const itensDoMenu = [
  { href: "/", rotulo: "Painel", icone: "▦" },
  { href: "/anuncios", rotulo: "Anúncios", icone: "✎" },
  { href: "/palavras-chave", rotulo: "Palavras-chave", icone: "#" },
] as const;

/** Diz se o item do menu corresponde à rota atual ("/" só casa exatamente). */
export function itemEstaAtivo(hrefDoItem: string, rotaAtual: string): boolean {
  if (hrefDoItem === "/") return rotaAtual === "/";
  return rotaAtual === hrefDoItem || rotaAtual.startsWith(`${hrefDoItem}/`);
}
