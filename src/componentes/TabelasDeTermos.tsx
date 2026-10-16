"use client";

import { montarCsvDeNegativas, montarCsvDePalavrasNovas } from "@/api/servicos/csv";
import type { SugestaoDeNegativa, SugestaoDePalavraNova } from "@/api/servicos/termos";
import { BotaoExportarCsv } from "./BotaoExportarCsv";
import { TabelaDados } from "./TabelaDados";

/** Negativas sugeridas (regra ou IA) com exportação para o Google Ads Editor. */
export function TabelaDeNegativas({
  titulo,
  negativas,
  moeda,
  nomeDoArquivo,
  mensagemVazia,
}: {
  titulo: string;
  negativas: SugestaoDeNegativa[];
  moeda: string;
  nomeDoArquivo: string;
  mensagemVazia: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <BotaoExportarCsv conteudo={montarCsvDeNegativas(negativas)} nomeDoArquivo={nomeDoArquivo} quantidade={negativas.length} />
      </div>
      <TabelaDados
        titulo={titulo}
        moeda={moeda}
        mensagemVazia={mensagemVazia}
        colunas={[
          { chave: "termo", titulo: "Termo (negativa exata)", formato: "texto" },
          { chave: "motivo", titulo: "Motivo", formato: "texto" },
          { chave: "local", titulo: "Campanha › Grupo", formato: "texto" },
          { chave: "cliques", titulo: "Cliques", formato: "numero" },
          { chave: "custo", titulo: "Custo", formato: "moeda" },
        ]}
        linhas={negativas.map((n) => ({
          chave: `${n.grupoId}-${n.termo}`,
          termo: n.termo,
          motivo: n.motivo,
          local: `${n.campanhaNome} › ${n.grupoNome}`,
          cliques: n.cliques,
          custo: n.custo,
          destaque: 1,
        }))}
      />
    </div>
  );
}

/** Novas palavras-chave sugeridas (regra ou IA) com exportação para o Google Ads Editor. */
export function TabelaDePalavrasNovas({
  titulo,
  palavras,
  moeda,
  nomeDoArquivo,
  mensagemVazia,
}: {
  titulo: string;
  palavras: SugestaoDePalavraNova[];
  moeda: string;
  nomeDoArquivo: string;
  mensagemVazia: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <BotaoExportarCsv conteudo={montarCsvDePalavrasNovas(palavras)} nomeDoArquivo={nomeDoArquivo} quantidade={palavras.length} />
      </div>
      <TabelaDados
        titulo={titulo}
        moeda={moeda}
        mensagemVazia={mensagemVazia}
        colunas={[
          { chave: "texto", titulo: "Palavra-chave", formato: "texto" },
          { chave: "correspondencia", titulo: "Corresp.", formato: "texto" },
          { chave: "motivo", titulo: "Motivo", formato: "texto" },
          { chave: "local", titulo: "Campanha › Grupo", formato: "texto" },
          { chave: "conversoes", titulo: "Conv.", formato: "numero" },
        ]}
        linhas={palavras.map((p) => ({
          chave: `${p.grupoId ?? "sem-grupo"}-${p.texto}`,
          texto: p.texto,
          correspondencia: p.correspondencia,
          motivo: p.motivo,
          local: p.grupoNome ? `${p.campanhaNome} › ${p.grupoNome}` : "escolha o grupo",
          conversoes: p.origem === "regra" ? p.conversoes : null,
        }))}
      />
    </div>
  );
}
