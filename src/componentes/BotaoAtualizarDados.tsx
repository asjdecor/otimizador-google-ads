"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BotaoVoltar } from "./BotaoVoltar";
import { enviarAcao } from "./enviar-acao";

/** Descarta o cache da conta e recarrega a tela com dados novos do Google. */
export function BotaoAtualizarDados() {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  async function atualizar() {
    setErro(null);
    const resultado = await enviarAcao("/api/cache/limpar");
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    iniciarTransicao(() => router.refresh());
  }

  return (
    <BotaoVoltar
      onClick={() => void atualizar()}
      disabled={pendente}
      aria-busy={pendente || undefined}
      title={erro ?? "Buscar dados novos no Google Ads"}
      className={erro ? "border-erro text-erro" : ""}
    >
      <span aria-hidden="true" className={pendente ? "animate-spin" : ""}>
        ↻
      </span>
      {pendente ? "Atualizando…" : erro ? "Falhou — tentar de novo" : "Atualizar"}
    </BotaoVoltar>
  );
}
