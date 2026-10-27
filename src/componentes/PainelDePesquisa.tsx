"use client";

import { useState } from "react";
import type { Etapa, PesquisaSalva, PontoDePartida } from "@/api/servicos/esquema-pesquisa-de-mercado";
import { formatarMoeda } from "@/api/servicos/formatacao";
import { Aviso } from "./Aviso";
import { BotaoConfirmar } from "./BotaoConfirmar";
import { CartaoConcorrente } from "./CartaoConcorrente";
import { enviarAcao } from "./enviar-acao";
import { TabelaDePalavrasRecomendadas } from "./TabelaDePalavrasRecomendadas";

const PROGRESSO: Record<Etapa, string> = {
  CONCORRENTES: "Buscando concorrentes…",
  SITES: "Lendo os sites…",
  VOLUMES: "Consultando volumes no Google…",
  RECOMENDACAO: "Recomendando palavras…",
};

/** O servidor devolve `{ pesquisa }`; confere só o que o laço precisa antes de confiar no resto. */
function extrairPesquisa(dados: unknown): PesquisaSalva | null {
  if (typeof dados !== "object" || dados === null || !("pesquisa" in dados)) return null;
  const p = dados.pesquisa as Partial<PesquisaSalva> | null;
  return p && typeof p.id === "string" && typeof p.etapa === "string" ? (p as PesquisaSalva) : null;
}

function PontoDePartidaDaPesquisa({ ponto }: { ponto: PontoDePartida }) {
  return (
    <dl className="grid gap-2 md:grid-cols-3">
      <div>
        <dt className="text-[13px] text-texto-suave">Seu site</dt>
        <dd className="font-bold">{ponto.dominio ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-[13px] text-texto-suave">Palavras de partida</dt>
        <dd className="font-bold">{ponto.palavras.length > 0 ? ponto.palavras.join(", ") : "—"}</dd>
      </div>
      <div>
        <dt className="text-[13px] text-texto-suave">Regiões</dt>
        <dd className="font-bold">
          {ponto.nomesGeo.length > 0
            ? ponto.nomesGeo.map((nome) => nome.replaceAll(",", ", ")).join("; ")
            : "Não encontramos a região das suas campanhas; a pesquisa vai considerar o Brasil inteiro."}
        </dd>
      </div>
    </dl>
  );
}

/** Pesquisa de mercado: inicia, roda as etapas em sequência (uma chamada por etapa) e mostra o resultado. */
export function PainelDePesquisa({
  pesquisaInicial,
  pontoDePartida,
  iaConfigurada,
  moeda,
}: {
  pesquisaInicial: PesquisaSalva | null;
  pontoDePartida: PontoDePartida | null;
  iaConfigurada: boolean;
  moeda: string;
}) {
  const [pesquisa, setPesquisa] = useState(pesquisaInicial);
  const [rodando, setRodando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recomecando, setRecomecando] = useState(false);

  /** Chama a rota da etapa atual até concluir, falhar (erroEtapa) ou o servidor devolver erro. */
  async function percorrer(inicial: PesquisaSalva) {
    setRodando(true);
    setErro(null);
    let atual = inicial;
    setPesquisa(atual);
    while (atual.etapa !== "CONCLUIDA" && !atual.erroEtapa) {
      const resultado = await enviarAcao(`/api/pesquisa/${atual.id}/etapa`, { etapa: atual.etapa });
      if (!resultado.ok) {
        setErro(resultado.erro);
        break;
      }
      const proxima = extrairPesquisa(resultado.dados);
      if (!proxima) {
        setErro("Resposta inesperada do servidor. Tente de novo.");
        break;
      }
      atual = proxima;
      setPesquisa(atual);
    }
    setRodando(false);
  }

  async function iniciar() {
    setErro(null);
    setRodando(true);
    const resultado = await enviarAcao("/api/pesquisa");
    const nova = resultado.ok ? extrairPesquisa(resultado.dados) : null;
    if (!nova) {
      setErro(resultado.ok ? "Resposta inesperada do servidor. Tente de novo." : resultado.erro);
      setRodando(false);
      return;
    }
    setRecomecando(false);
    await percorrer(nova);
  }

  const concluida = pesquisa?.etapa === "CONCLUIDA";
  const emAndamento = pesquisa !== null && !concluida && !pesquisa.erroEtapa;
  const mostrarInicio = pontoDePartida !== null && (pesquisa === null || recomecando);
  const podeRecomecar = pesquisa !== null && !recomecando && !rodando && (concluida || Boolean(pesquisa.erroEtapa));
  const relatorios = pesquisa?.relatorios ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Aviso tipo="aviso">
        A pesquisa mostra o que é público (sites e resultados de busca). Ninguém vê as palavras-chave nem os lances que um
        concorrente compra.
      </Aviso>
      {!iaConfigurada && <Aviso tipo="erro">Para usar a IA, preencha ANTHROPIC_API_KEY no .env e reinicie o app.</Aviso>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {mostrarInicio && (
        <section className="flex flex-col gap-4 rounded-card border border-borda bg-superficie p-4" aria-label="Ponto de partida">
          <PontoDePartidaDaPesquisa ponto={pontoDePartida} />
          <p className="text-[13px] text-texto-suave">Custo estimado: US$ 0,30 a US$ 1,00 por pesquisa.</p>
          {iaConfigurada && (
            <div>
              <BotaoConfirmar id="iniciar-pesquisa" carregando={rodando} textoCarregando="Pesquisando…" onClick={() => void iniciar()}>
                Pesquisar concorrentes
              </BotaoConfirmar>
            </div>
          )}
        </section>
      )}

      {pesquisa && (
        <section className="flex flex-col gap-4" aria-label="Andamento da pesquisa">
          <div className="flex flex-wrap items-center gap-3">
            {(rodando || emAndamento) && pesquisa.etapa !== "CONCLUIDA" && (
              <p role="status" className="font-bold">
                {PROGRESSO[pesquisa.etapa]}
              </p>
            )}
            <span className="text-[13px] text-texto-suave">{`Custo desta pesquisa: ${formatarMoeda(pesquisa.custoDolares, "USD")}`}</span>
          </div>
          {pesquisa.erroEtapa && <Aviso tipo="erro">{pesquisa.erroEtapa}</Aviso>}
          {iaConfigurada && !rodando && (pesquisa.erroEtapa || emAndamento) && pesquisa.etapa !== "CONCLUIDA" && (
            <div>
              <BotaoConfirmar id="tentar-etapa" onClick={() => void percorrer({ ...pesquisa, erroEtapa: null })}>
                {pesquisa.erroEtapa ? "Tentar esta etapa de novo" : "Continuar de onde parou"}
              </BotaoConfirmar>
            </div>
          )}
          {podeRecomecar && pontoDePartida && (
            <div>
              <BotaoConfirmar id="nova-pesquisa" onClick={() => setRecomecando(true)}>
                Nova pesquisa
              </BotaoConfirmar>
            </div>
          )}
        </section>
      )}

      {relatorios.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="titulo-concorrentes">
          <h2 id="titulo-concorrentes">Concorrentes</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {relatorios.map((relatorio) => (
              <CartaoConcorrente key={relatorio.dominio} relatorio={relatorio} />
            ))}
          </div>
        </section>
      )}

      {pesquisa?.volumes && !pesquisa.volumes.disponivel && (
        <Aviso tipo="aviso">{`Sem volume (Planejador indisponível: ${pesquisa.volumes.motivo})`}</Aviso>
      )}

      {pesquisa?.recomendadas && (
        <section className="flex flex-col gap-3" aria-labelledby="titulo-recomendadas">
          <h2 id="titulo-recomendadas">Palavras recomendadas</h2>
          <TabelaDePalavrasRecomendadas palavras={pesquisa.recomendadas} negativas={pesquisa.negativas ?? []} moeda={moeda} />
        </section>
      )}
    </div>
  );
}
