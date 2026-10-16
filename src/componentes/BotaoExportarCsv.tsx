"use client";

import { BotaoVoltar } from "./BotaoVoltar";

/** Baixa um CSV gerado na própria página (nada é enviado para fora). */
export function BotaoExportarCsv({ conteudo, nomeDoArquivo, quantidade }: { conteudo: string; nomeDoArquivo: string; quantidade: number }) {
  function baixar() {
    const url = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeDoArquivo;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <BotaoVoltar onClick={baixar} disabled={quantidade === 0} title="Formato do Google Ads Editor">
      ⭳ Exportar CSV ({quantidade})
    </BotaoVoltar>
  );
}
