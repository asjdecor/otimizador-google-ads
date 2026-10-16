"use client";

import { useState } from "react";
import { enviarAcao } from "./enviar-acao";

/** Encerra a sessão do app e volta para o login. */
export function BotaoSair() {
  const [saindo, setSaindo] = useState(false);
  async function sair() {
    setSaindo(true);
    await enviarAcao("/api/auth/sair");
    window.location.assign("/login");
  }
  return (
    <button
      type="button"
      onClick={() => void sair()}
      disabled={saindo}
      className="min-h-11 rounded-lg px-2 text-[13px] text-texto-suave hover:text-erro disabled:opacity-40"
    >
      {saindo ? "Saindo…" : "Sair"}
    </button>
  );
}
