"use client";

import { useState, type FormEvent } from "react";
import { esquemaAnaliseSalva, type AnaliseSalva } from "@/api/servicos/esquema-analise-de-termos";
import { formatarCustoDaIa, formatarDataHora } from "@/api/servicos/formatacao";
import { TAMANHO_MAXIMO_DO_CONTEXTO } from "@/api/servicos/limites-de-sugestao";
import { Aviso } from "./Aviso";
import { BotaoConfirmar } from "./BotaoConfirmar";
import { CampoTexto } from "./CampoTexto";
import { enviarAcao } from "./enviar-acao";
import { TabelaDeNegativas, TabelaDePalavrasNovas } from "./TabelasDeTermos";

/** F5 (IA) — botão "Analisar com IA" e o resultado da última análise da conta. */
export function PainelAnaliseDeTermos({
  analiseInicial,
  iaConfigurada,
  moeda,
}: {
  analiseInicial: AnaliseSalva | null;
  iaConfigurada: boolean;
  moeda: string;
}) {
  const [contexto, setContexto] = useState("");
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [analise, setAnalise] = useState(analiseInicial);

  async function analisar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setAnalisando(true);
    const resultado = await enviarAcao("/api/termos/analisar", { contexto: contexto.trim() || undefined });
    setAnalisando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    const resposta = esquemaAnaliseSalva.safeParse(
      typeof resultado.dados === "object" && resultado.dados !== null && "analise" in resultado.dados ? resultado.dados.analise : null,
    );
    if (!resposta.success) {
      setErro("Resposta inesperada do servidor. Tente de novo.");
      return;
    }
    setAnalise(resposta.data);
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="titulo-analise-ia">
      <div>
        <h2 id="titulo-analise-ia">Análise com IA</h2>
        <p className="text-texto-suave">
          A IA lê os termos do período e aponta os irrelevantes para o seu negócio e variações de palavras-chave que valem
          testar.
        </p>
      </div>
      <Aviso tipo="aviso">
        <strong>Revise antes de aplicar. A IA pode errar.</strong> Uma negativa errada bloqueia buscas boas.
      </Aviso>
      {!iaConfigurada && <Aviso tipo="erro">Para usar a IA, preencha ANTHROPIC_API_KEY no .env e reinicie o app.</Aviso>}

      <form onSubmit={(e) => void analisar(e)} className="flex flex-col gap-3 rounded-card border border-borda bg-superficie p-4">
        <CampoTexto
          id="contexto-termos"
          rotulo="O que você vende e o que NÃO vende (ex.: “só sofás novos, só em SP, não faço conserto”) — ajuda a IA a acertar"
          value={contexto}
          maxLength={TAMANHO_MAXIMO_DO_CONTEXTO}
          onChange={(e) => setContexto(e.target.value)}
          disabled={analisando || !iaConfigurada}
        />
        <div className="flex flex-wrap items-center gap-3">
          <BotaoConfirmar
            id="analisar-termos"
            type="submit"
            carregando={analisando}
            textoCarregando="Analisando… (até 30 s)"
            disabled={!iaConfigurada}
            erro={erro ?? undefined}
          >
            Analisar com IA
          </BotaoConfirmar>
          <span className="text-[13px] text-texto-suave">usa créditos da sua conta Anthropic</span>
        </div>
      </form>

      {analise && (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-texto-suave">
            Análise de {formatarDataHora(analise.criadoEm)} · {analise.modelo} · {formatarCustoDaIa(analise.custoEstimadoEmDolares)}
            {analise.contextoUsuario && <> · contexto: “{analise.contextoUsuario}”</>}
          </p>
          <h3 className="font-extrabold">Termos irrelevantes (negativas sugeridas pela IA)</h3>
          <TabelaDeNegativas
            titulo="Negativas sugeridas pela IA"
            negativas={analise.negativas}
            moeda={moeda}
            nomeDoArquivo="negativas-ia.csv"
            mensagemVazia="A IA não encontrou termos claramente irrelevantes."
          />
          <h3 className="font-extrabold">Variações de palavras-chave sugeridas pela IA</h3>
          <TabelaDePalavrasNovas
            titulo="Palavras novas sugeridas pela IA"
            palavras={analise.novas}
            moeda={moeda}
            nomeDoArquivo="palavras-novas-ia.csv"
            mensagemVazia="A IA não sugeriu variações novas."
          />
        </div>
      )}
    </section>
  );
}
