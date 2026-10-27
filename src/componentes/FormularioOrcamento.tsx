"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { BotaoConfirmar } from "./BotaoConfirmar";
import { CampoTexto } from "./CampoTexto";
import { enviarAcao } from "./enviar-acao";

export function FormularioOrcamento({
  titulo,
  valorAtual,
  nomeCampo,
}: {
  titulo: string;
  valorAtual: number | null;
  nomeCampo: "orcamentoMaximoPorCampanha" | "orcamentoMaximoTotal";
}) {
  const router = useRouter();
  const [valor, setValor] = useState(valorAtual === null ? "" : String(valorAtual));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [, iniciarTransicao] = useTransition();

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const texto = valor.trim();
    const numero = texto === "" ? null : Number(texto);

    if (numero !== null && (!Number.isInteger(numero) || numero < 0)) {
      setErro("Informe um valor inteiro em reais (ex.: 250). ");
      return;
    }

    setErro(null);
    setSalvando(true);
    const resultado = await enviarAcao("/api/configuracao/orcamento", { [nomeCampo]: numero });
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    iniciarTransicao(() => router.refresh());
  }

  const mudou = valor !== (valorAtual === null ? "" : String(valorAtual));

  return (
    <form onSubmit={(e) => void salvar(e)} className="flex flex-wrap items-end gap-3">
      <div className="w-40">
        <CampoTexto
          id={nomeCampo}
          rotulo={titulo}
          inputMode="numeric"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          erro={erro ?? undefined}
          placeholder="Sem teto"
        />
      </div>
      <BotaoConfirmar type="submit" carregando={salvando} textoCarregando="Salvando…" disabled={!mudou}>
        Salvar
      </BotaoConfirmar>
    </form>
  );
}
