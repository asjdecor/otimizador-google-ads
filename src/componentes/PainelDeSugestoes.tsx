"use client";

import { useState, type FormEvent } from "react";
import { formatarCustoDaIa, formatarDataHora } from "@/api/servicos/formatacao";
import { TAMANHO_MAXIMO_DO_CONTEXTO } from "@/api/servicos/limites-de-sugestao";
import { Aviso } from "./Aviso";
import { BotaoConfirmar } from "./BotaoConfirmar";
import { CampoTexto } from "./CampoTexto";
import { enviarAcao } from "./enviar-acao";
import { esquemaRespostaDaGeracao, type SugestaoParaTela } from "./esquema-sugestao";
import { ListaDeSugestoes } from "./ListaDeSugestoes";

/** F4 — contexto opcional, botão Gerar, resultado com copiar e histórico de gerações. */
export function PainelDeSugestoes({
  anuncioId,
  historicoInicial,
  iaConfigurada,
}: {
  anuncioId: string;
  historicoInicial: SugestaoParaTela[];
  iaConfigurada: boolean;
}) {
  const [contexto, setContexto] = useState("");
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [incompleto, setIncompleto] = useState(false);
  const [historico, setHistorico] = useState(historicoInicial);
  const atual = historico[0] ?? null;

  async function gerar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setGerando(true);
    const resultado = await enviarAcao("/api/sugestoes", { anuncioId, contexto: contexto.trim() || undefined });
    setGerando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    const resposta = esquemaRespostaDaGeracao.safeParse(resultado.dados);
    if (!resposta.success) {
      setErro("Resposta inesperada do servidor. Tente de novo.");
      return;
    }
    setIncompleto(resposta.data.incompleto);
    setHistorico((anterior) => [resposta.data.sugestao, ...anterior]);
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="titulo-sugestoes">
      <h2 id="titulo-sugestoes">Sugestões com IA</h2>

      <Aviso tipo="aviso">
        <strong>Revise antes de publicar. A IA pode errar.</strong> Confira preços, prazos e promessas: o app pede para a
        IA não inventar, mas a responsabilidade pelo anúncio é sua.
      </Aviso>

      {!iaConfigurada && (
        <Aviso tipo="erro">Para gerar sugestões, preencha ANTHROPIC_API_KEY no arquivo .env e reinicie o app.</Aviso>
      )}

      <form onSubmit={(e) => void gerar(e)} className="flex flex-col gap-3 rounded-card border border-borda bg-superficie p-4">
        <CampoTexto
          id="contexto-ia"
          rotulo="Contexto opcional: diferencial, oferta, tom de voz (ex.: “frete grátis em SP, tom acolhedor”)"
          value={contexto}
          maxLength={TAMANHO_MAXIMO_DO_CONTEXTO}
          onChange={(e) => setContexto(e.target.value)}
          disabled={gerando || !iaConfigurada}
        />
        <div className="flex flex-wrap items-center gap-3">
          <BotaoConfirmar
            id="gerar-sugestoes"
            type="submit"
            carregando={gerando}
            textoCarregando="Gerando… (até 20 s)"
            disabled={!iaConfigurada}
            erro={erro ?? undefined}
          >
            Gerar sugestões
          </BotaoConfirmar>
          <span className="text-[13px] text-texto-suave">
            {contexto.length}/{TAMANHO_MAXIMO_DO_CONTEXTO} · cada geração usa créditos da sua conta Anthropic
          </span>
        </div>
      </form>

      {atual && (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-texto-suave">
            Geração de {formatarDataHora(atual.criadoEm)} · {atual.modelo} · {formatarCustoDaIa(atual.custoEstimadoEmDolares)}
            {atual.contextoUsuario && <> · contexto: “{atual.contextoUsuario}”</>}
          </p>
          {incompleto && (
            <Aviso tipo="aviso">
              A IA trouxe menos textos válidos que o ideal (alguns passaram do limite e foram descartados). Gere de novo
              para completar.
            </Aviso>
          )}
          <ListaDeSugestoes titulos={atual.titulos} descricoes={atual.descricoes} />
        </div>
      )}

      {historico.length > 1 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-extrabold">Gerações anteriores</h3>
          {historico.slice(1).map((s) => (
            <details key={s.id} className="rounded-card border border-borda bg-superficie p-3">
              <summary className="min-h-11 cursor-pointer content-center text-texto-suave">
                {formatarDataHora(s.criadoEm)} · {s.titulos.length} títulos · {s.descricoes.length} descrições
                {s.contextoUsuario && <> · “{s.contextoUsuario}”</>}
              </summary>
              <div className="pt-3">
                <ListaDeSugestoes titulos={s.titulos} descricoes={s.descricoes} />
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
