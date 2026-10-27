"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";
import { formatarCustoDaIa, formatarDataHora, formatarMoeda, formatarNumero } from "@/api/servicos/formatacao";
import { AGENTES_ANALISE_PREMIUM, esquemaResultadoAnalisePremium } from "@/api/servicos/esquema-analise-premium";
import { Aviso } from "./Aviso";
import { BotaoConfirmar } from "./BotaoConfirmar";
import { CampoTexto } from "./CampoTexto";
import { enviarAcao } from "./enviar-acao";

const esquemaRespostaApi = z.object({
  analise: esquemaResultadoAnalisePremium,
  fontes: z.object({
    periodo: z.string(),
    totalIdeiasPlanejador: z.number(),
    totalTermosPesquisa: z.number(),
    totalCampanhas: z.number(),
    totalConcorrentes: z.number(),
    ideiasPlanejador: z.array(
      z.object({
        texto: z.string(),
        volumeMensal: z.number().nullable(),
        concorrencia: z.enum(["BAIXA", "MEDIA", "ALTA", "SEM_DADOS"]),
        lanceAlto: z.number().nullable(),
      }),
    ),
  }),
});

type RespostaDaAnalise = z.infer<typeof esquemaRespostaApi>;

const NOMES_DOS_AGENTES: Record<(typeof AGENTES_ANALISE_PREMIUM)[number], string> = {
  pesquisa_palavras: "Pesquisa de palavras-chave",
  intencao_busca: "Intenção de busca",
  concorrencia: "Concorrência",
  qualidade_pagina: "Qualidade da página",
  score_custo: "Custo e eficiência",
  segmentacao_geo: "Segmentação geográfica",
  match_type: "Correspondência",
  negativas: "Palavras negativas",
  riscos_politica: "Riscos de política",
  correcao_acao: "Plano de correção",
};

const PRIORIDADES: Record<"alta" | "media" | "baixa", string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export function PainelAnalisePremium({
  provedoresConfigurados,
  moeda,
}: {
  provedoresConfigurados: string[];
  moeda: string;
}) {
  const [contexto, setContexto] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resposta, setResposta] = useState<RespostaDaAnalise | null>(null);

  async function analisar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setAnalisando(true);
    const resultado = await enviarAcao("/api/analise/premium", {
      contexto: contexto.trim() || undefined,
      objetivo: objetivo.trim() || undefined,
    });
    setAnalisando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }

    const validado = esquemaRespostaApi.safeParse(resultado.dados);
    if (!validado.success) {
      setErro("Resposta inesperada do servidor. Tente novamente.");
      return;
    }
    setResposta(validado.data);
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="titulo-analise-premium">
      <div>
        <h2 id="titulo-analise-premium">Análise premium de campanhas e palavras-chave</h2>
        <p className="text-texto-suave">
          Cruza métricas da conta, ideias do Planejador do Google e recomendações independentes de Claude e OpenAI.
          Nenhuma alteração é aplicada às campanhas.
        </p>
      </div>

      <Aviso tipo="aviso">
        O score é uma avaliação da IA, não uma métrica oficial do Google. Revise recomendações e confirme dados no Google
        Ads antes de agir; palavras negativas podem bloquear tráfego útil.
      </Aviso>

      {provedoresConfigurados.length === 0 ? (
        <Aviso tipo="erro">
          Configure <code>ANTHROPIC_API_KEY</code> e/ou <code>OPENAI_API_KEY</code> no ambiente. Não cole chaves na tela.
        </Aviso>
      ) : (
        <p className="text-[13px] text-texto-suave">
          Provedores habilitados: {provedoresConfigurados.join(" + ")}. Quando os dois estiverem configurados, as análises
          rodam em paralelo e são consolidadas.
        </p>
      )}

      <form onSubmit={(evento) => void analisar(evento)} className="flex flex-col gap-3 rounded-card border border-borda bg-superficie p-4">
        <CampoTexto
          id="contexto-premium"
          rotulo="Contexto do negócio (o que vende, diferenciais e restrições)"
          value={contexto}
          maxLength={1000}
          onChange={(evento) => setContexto(evento.target.value)}
          disabled={analisando || provedoresConfigurados.length === 0}
        />
        <CampoTexto
          id="objetivo-premium"
          rotulo="Objetivo da análise (opcional)"
          value={objetivo}
          maxLength={300}
          onChange={(evento) => setObjetivo(evento.target.value)}
          disabled={analisando || provedoresConfigurados.length === 0}
        />
        <div className="flex flex-wrap items-center gap-3">
          <BotaoConfirmar
            id="analisar-premium"
            type="submit"
            carregando={analisando}
            textoCarregando="Consultando Google e analisando…"
            disabled={provedoresConfigurados.length === 0}
            erro={erro ?? undefined}
          >
            Analisar com IA
          </BotaoConfirmar>
          <span className="text-[13px] text-texto-suave">consultas Google Ads e uso das APIs de IA podem gerar custos</span>
        </div>
      </form>

      {resposta && (
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-card border border-borda bg-superficie p-4">
              <p className="text-[13px] text-texto-suave">Score da IA (0–100)</p>
              <p className="text-2xl font-extrabold">{resposta.analise.scoreTotal}</p>
            </div>
            <div className="rounded-card border border-borda bg-superficie p-4">
              <p className="text-[13px] text-texto-suave">Ideias do Planejador</p>
              <p className="text-2xl font-extrabold">{resposta.fontes.totalIdeiasPlanejador}</p>
            </div>
            <div className="rounded-card border border-borda bg-superficie p-4">
              <p className="text-[13px] text-texto-suave">Campanhas analisadas</p>
              <p className="text-2xl font-extrabold">{resposta.fontes.totalCampanhas}</p>
            </div>
            <div className="rounded-card border border-borda bg-superficie p-4">
              <p className="text-[13px] text-texto-suave">Termos de pesquisa</p>
              <p className="text-2xl font-extrabold">{resposta.fontes.totalTermosPesquisa}</p>
            </div>
            <div className="rounded-card border border-borda bg-superficie p-4">
              <p className="text-[13px] text-texto-suave">Concorrentes na pesquisa</p>
              <p className="text-2xl font-extrabold">{resposta.fontes.totalConcorrentes}</p>
            </div>
          </div>

          <p className="text-[13px] text-texto-suave">
            {formatarDataHora(resposta.analise.criadoEm)} · {resposta.analise.provedores.map((item) => `${item.nome} (${item.modelo})`).join(" + ")}
            {" · "}
            {formatarCustoDaIa(resposta.analise.custoEstimadoEmDolares)} · Período {resposta.fontes.periodo}
          </p>

          {resposta.analise.avisos.map((aviso, indice) => (
            <Aviso key={`aviso-${indice}`} tipo="aviso">{aviso}</Aviso>
          ))}

          <div className="rounded-card border border-borda bg-superficie p-4">
            <h3 className="font-extrabold">Resumo</h3>
            <p className="mt-2 text-texto-suave">{resposta.analise.resumo}</p>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="font-extrabold">Dez perspectivas especialistas</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {resposta.analise.agentes.map((agente) => (
                <article key={agente.agente} className="rounded-card border border-borda bg-superficie p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-bold">{NOMES_DOS_AGENTES[agente.agente]}</h4>
                    <span className="text-[13px] text-texto-suave">
                      {agente.score === null ? "Sem dados para pontuar" : `Score ${agente.score}/100`}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-texto-suave">Prioridade: {PRIORIDADES[agente.prioridade]}</p>
                  {agente.observacoes.length > 0 && (
                    <ul className="mt-3 list-disc pl-5 text-sm">
                      {agente.observacoes.map((observacao, indice) => <li key={indice}>{observacao}</li>)}
                    </ul>
                  )}
                  {agente.recomendacoes.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-sm text-texto-suave">
                      {agente.recomendacoes.map((recomendacao, indice) => <li key={indice}>{recomendacao}</li>)}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </div>

          {resposta.analise.palavrasPriorizadas.length > 0 && (
            <div className="rounded-card border border-borda bg-superficie p-4">
              <h3 className="font-extrabold">Palavras priorizadas</h3>
              <p className="mt-2 text-texto-suave">{resposta.analise.palavrasPriorizadas.join(" · ")}</p>
            </div>
          )}

          {resposta.fontes.ideiasPlanejador.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="font-extrabold">Dados medidos pelo Planejador do Google</h3>
              <p className="text-[13px] text-texto-suave">
                Volumes mensais e concorrência vêm do Planejador; o lance é uma estimativa de topo de página, não promessa de CPC.
              </p>
              <div className="overflow-x-auto rounded-card border border-borda bg-superficie">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-borda">
                      <th scope="col" className="px-3 py-2">Palavra-chave</th>
                      <th scope="col" className="px-3 py-2">Buscas/mês</th>
                      <th scope="col" className="px-3 py-2">Concorrência</th>
                      <th scope="col" className="px-3 py-2">Lance alto estimado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resposta.fontes.ideiasPlanejador.map((ideia) => (
                      <tr key={ideia.texto} className="border-b border-borda last:border-0">
                        <td className="px-3 py-2">{ideia.texto}</td>
                        <td className="px-3 py-2">{ideia.volumeMensal === null ? "Sem volume" : formatarNumero(ideia.volumeMensal)}</td>
                        <td className="px-3 py-2">
                          {ideia.concorrencia === "BAIXA" ? "Baixa" : ideia.concorrencia === "MEDIA" ? "Média" : ideia.concorrencia === "ALTA" ? "Alta" : "Sem dados"}
                        </td>
                        <td className="px-3 py-2">{ideia.lanceAlto === null ? "—" : formatarMoeda(ideia.lanceAlto, moeda)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {resposta.analise.correcoes.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="font-extrabold">Plano de correção recomendado</h3>
              {resposta.analise.correcoes.map((correcao, indice) => (
                <article key={`${correcao.agente}-${indice}`} className="rounded-card border border-borda bg-superficie p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-bold">{correcao.titulo}</h4>
                    <span className="text-[13px] text-texto-suave">{PRIORIDADES[correcao.prioridade]}</span>
                  </div>
                  <p className="mt-2 text-sm">{correcao.descricao}</p>
                  <p className="mt-1 text-[13px] text-texto-suave">Impacto esperado: {correcao.impacto}</p>
                  {correcao.acao.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-sm">
                      {correcao.acao.map((acao, acaoIndice) => <li key={acaoIndice}>{acao}</li>)}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}

          {resposta.analise.riscos.length > 0 && (
            <div className="rounded-card border border-borda bg-superficie p-4">
              <h3 className="font-extrabold">Riscos a revisar</h3>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {resposta.analise.riscos.map((risco, indice) => <li key={indice}>{risco}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
