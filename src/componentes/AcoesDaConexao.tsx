"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BotaoCancelar } from "./BotaoCancelar";
import { BotaoVoltar } from "./BotaoVoltar";
import { enviarAcao } from "./enviar-acao";

/** Botões da tela Conectar quando já há conta: atualizar lista e desconectar. */
export function AcoesDaConexao() {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();
  const [acaoAtual, setAcaoAtual] = useState<"sincronizar" | "desconectar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function executar(acao: "sincronizar" | "desconectar") {
    if (acao === "desconectar" && !window.confirm("Desconectar a conta Google? O token salvo será apagado.")) return;
    setErro(null);
    setAcaoAtual(acao);
    const url = acao === "sincronizar" ? "/api/contas/sincronizar" : "/api/auth/desconectar";
    const resultado = await enviarAcao(url);
    setAcaoAtual(null);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    iniciarTransicao(() => router.refresh());
  }

  const ocupado = pendente || acaoAtual !== null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3">
        <BotaoVoltar onClick={() => void executar("sincronizar")} disabled={ocupado}>
          {acaoAtual === "sincronizar" ? "Buscando contas…" : "↻ Atualizar lista de contas"}
        </BotaoVoltar>
        <BotaoCancelar onClick={() => void executar("desconectar")} disabled={ocupado}>
          {acaoAtual === "desconectar" ? "Desconectando…" : "Desconectar"}
        </BotaoCancelar>
      </div>
      {erro && (
        <span role="alert" className="text-[13px] leading-[18px] text-erro">
          {erro}
        </span>
      )}
    </div>
  );
}
