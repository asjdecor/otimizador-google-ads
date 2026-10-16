"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { BotaoConfirmar } from "./BotaoConfirmar";
import { CampoTexto } from "./CampoTexto";
import { enviarAcao } from "./enviar-acao";

/** Edita o limite (R$) a partir do qual palavra sem conversão vira desperdício. */
export function FormularioLimite({ limiteAtual }: { limiteAtual: number }) {
  const router = useRouter();
  const [valor, setValor] = useState(String(limiteAtual));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [, iniciarTransicao] = useTransition();

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const numero = Number(valor);
    if (valor.trim() === "" || !Number.isInteger(numero) || numero < 0) {
      setErro("Informe um valor inteiro em reais (ex.: 50).");
      return;
    }
    setErro(null);
    setSalvando(true);
    const resultado = await enviarAcao("/api/configuracao/limite", { limiteDesperdicio: numero });
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    iniciarTransicao(() => router.refresh());
  }

  const mudou = valor !== String(limiteAtual);
  return (
    <form onSubmit={(e) => void salvar(e)} className="flex flex-wrap items-end gap-3">
      <div className="w-40">
        <CampoTexto
          id="limite-desperdicio"
          rotulo="Gasto mínimo sem conversão (R$)"
          inputMode="numeric"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          erro={erro ?? undefined}
        />
      </div>
      <BotaoConfirmar type="submit" carregando={salvando} textoCarregando="Salvando…" disabled={!mudou}>
        Salvar
      </BotaoConfirmar>
    </form>
  );
}
