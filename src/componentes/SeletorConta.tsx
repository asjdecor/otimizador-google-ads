"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatarIdDaConta } from "@/api/servicos/formatacao";
import { enviarAcao } from "./enviar-acao";

interface OpcaoDeConta {
  customerId: string;
  nome: string;
}

/** Escolhe a conta de anúncios analisada (MCCs não aparecem: não têm anúncios). */
export function SeletorConta({ contas, selecionada }: { contas: OpcaoDeConta[]; selecionada: string | null }) {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  async function trocarConta(customerId: string) {
    setErro(null);
    const resultado = await enviarAcao("/api/contas/selecionar", { customerId });
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    iniciarTransicao(() => router.refresh());
  }

  if (contas.length === 0) {
    return <span className="text-texto-suave">Nenhuma conta de anúncios encontrada</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="seletor-conta" className="sr-only">
        Conta de anúncios
      </label>
      <select
        id="seletor-conta"
        value={selecionada ?? ""}
        disabled={pendente}
        aria-invalid={erro ? true : undefined}
        onChange={(evento) => void trocarConta(evento.target.value)}
        className={`min-h-11 max-w-full rounded-lg border bg-superficie px-3 transition-colors hover:border-texto-suave focus:border-2 focus:border-primaria disabled:bg-fundo disabled:text-texto-suave ${
          erro ? "border-erro" : "border-borda"
        }`}
      >
        {selecionada === null && <option value="">Escolha uma conta…</option>}
        {contas.map((conta) => (
          <option key={conta.customerId} value={conta.customerId}>
            {conta.nome} ({formatarIdDaConta(conta.customerId)})
          </option>
        ))}
      </select>
      {erro && (
        <span role="alert" className="text-[13px] leading-[18px] text-erro">
          {erro}
        </span>
      )}
    </div>
  );
}
