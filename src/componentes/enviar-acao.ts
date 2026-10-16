export type ResultadoDaAcao = { ok: true; dados: unknown } | { ok: false; erro: string };

/** POST JSON para uma rota do app; devolve o corpo da resposta, ou a mensagem de erro da rota. */
export async function enviarAcao(url: string, corpo?: unknown): Promise<ResultadoDaAcao> {
  try {
    const resposta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const dados: unknown = await resposta.json().catch(() => null);
    if (resposta.ok) return { ok: true, dados };
    const erro =
      typeof dados === "object" && dados !== null && "erro" in dados && typeof dados.erro === "string"
        ? dados.erro
        : "Algo deu errado. Tente de novo.";
    return { ok: false, erro };
  } catch {
    return { ok: false, erro: "Sem conexão com o servidor do app." };
  }
}
