import Link from "next/link";
import { notFound } from "next/navigation";
import { carregarContextoDaConta } from "@/api/http/contexto-da-conta";
import { traduzirErroGoogleAds } from "@/api/integracoes/google-ads/erros";
import { carregarAnuncioAvaliado, idDoAnuncioEhValido, type AnuncioAvaliado } from "@/api/servicos/anuncios";
import { contarCaracteresVisiveis, LIMITE_DESCRICAO, LIMITE_TITULO } from "@/api/servicos/diagnostico";
import { formatarData, formatarMoeda, formatarNumero, formatarPercentual } from "@/api/servicos/formatacao";
import type { IntervaloDeDatas } from "@/api/servicos/periodo";
import { Aviso } from "@/componentes/Aviso";
import { AvisoSemConta } from "@/componentes/AvisoSemConta";
import { CardMetrica } from "@/componentes/CardMetrica";
import { ItemDiagnostico } from "@/componentes/ItemDiagnostico";
import { SeloNota } from "@/componentes/SeloNota";

export const dynamic = "force-dynamic";

function ListaDeTextos({ titulo, textos, limite }: { titulo: string; textos: string[]; limite: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-borda bg-superficie p-4">
      <h2>
        {titulo} <span className="text-[15px] font-medium text-texto-suave">({textos.length})</span>
      </h2>
      <ol className="flex flex-col">
        {textos.map((texto, indice) => {
          const tamanho = contarCaracteresVisiveis(texto);
          return (
            <li key={`${indice}-${texto}`} className="flex items-center justify-between gap-3 border-t border-borda py-2 first:border-t-0">
              <span className="min-w-0 break-words">{texto}</span>
              <span className={`numero shrink-0 text-[13px] ${tamanho > limite ? "text-erro" : "text-texto-suave"}`}>
                {tamanho}/{limite}
              </span>
            </li>
          );
        })}
        {textos.length === 0 && <li className="py-2 text-texto-suave">Nenhum.</li>}
      </ol>
    </div>
  );
}

export default async function PaginaDoAnuncio({ params }: { params: Promise<{ id: string }> }) {
  const { id: idDaUrl } = await params;
  const id = decodeURIComponent(idDaUrl);
  if (!idDoAnuncioEhValido(id)) notFound();

  const contexto = await carregarContextoDaConta();
  if (contexto.tipo === "desconectado" || contexto.tipo === "sem-conta") {
    return <AvisoSemConta titulo="Anúncio" motivo={contexto.tipo} />;
  }

  let resultado: { intervalo: IntervaloDeDatas; anuncio: AnuncioAvaliado | null } | null = null;
  let erro = contexto.tipo === "erro" ? contexto.mensagem : null;
  if (contexto.tipo === "pronto") {
    try {
      resultado = await carregarAnuncioAvaliado(id, contexto);
    } catch (falha) {
      erro = traduzirErroGoogleAds(falha);
    }
  }

  const voltar = (
    <Link href="/anuncios" className="w-fit text-primaria hover:underline">
      ← Todos os anúncios
    </Link>
  );

  if (erro || !resultado) {
    return (
      <section className="flex max-w-3xl flex-col gap-4">
        {voltar}
        <h1>Anúncio</h1>
        <Aviso tipo="erro">{erro ?? "Não foi possível carregar o anúncio."}</Aviso>
      </section>
    );
  }

  const avaliado = resultado.anuncio;
  if (!avaliado) {
    return (
      <section className="flex max-w-3xl flex-col gap-4">
        {voltar}
        <h1>Anúncio não encontrado</h1>
        <Aviso tipo="aviso">
          Este anúncio não existe nesta conta, foi removido ou não é um anúncio responsivo de pesquisa. Confira a conta
          escolhida no topo ou clique em Atualizar.
        </Aviso>
      </section>
    );
  }

  const { anuncio, diagnostico, metricas } = avaliado;
  const moeda = contexto.conta.moeda || "BRL";
  const problemas = diagnostico.itens.filter((i) => i.situacao !== "ok").length;

  return (
    <section className="flex flex-col gap-6">
      {voltar}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="break-words">{anuncio.titulos[0] ?? `Anúncio ${anuncio.anuncioId}`}</h1>
          <p className="text-texto-suave">
            {anuncio.campanhaNome} › {anuncio.grupoNome} · {anuncio.status}
          </p>
          {anuncio.urlFinal && (
            <a href={anuncio.urlFinal} target="_blank" rel="noreferrer" className="w-fit break-all text-[13px] text-primaria hover:underline">
              {anuncio.urlFinal}
            </a>
          )}
        </div>
        <SeloNota nota={diagnostico.nota} tamanho="grande" />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[13px] text-texto-suave">
          Métricas de {formatarData(resultado.intervalo.inicio)} a {formatarData(resultado.intervalo.fim)}
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <CardMetrica rotulo="Impressões" valor={metricas && formatarNumero(metricas.impressoes)} />
          <CardMetrica rotulo="Cliques" valor={metricas && formatarNumero(metricas.cliques)} />
          <CardMetrica rotulo="CTR" valor={metricas && formatarPercentual(metricas.ctr)} />
          <CardMetrica rotulo="Conversões" valor={metricas && formatarNumero(metricas.conversoes)} />
          <CardMetrica rotulo="Custo" valor={metricas && formatarMoeda(metricas.custo, moeda)} />
        </div>
        {!metricas && <p className="text-[13px] text-texto-suave">Sem impressões neste período.</p>}
      </div>

      <div className="flex flex-col gap-2 rounded-card border border-borda bg-superficie p-4">
        <h2>Diagnóstico</h2>
        <p className="text-texto-suave">
          {problemas === 0
            ? "Nenhum problema encontrado pelas regras do app."
            : `${problemas} ${problemas === 1 ? "ponto a melhorar" : "pontos a melhorar"}. Os números à direita são os pontos perdidos na nota.`}
        </p>
        <ul>
          {diagnostico.itens.map((item) => (
            <ItemDiagnostico key={item.regra} item={item} />
          ))}
        </ul>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListaDeTextos titulo="Títulos" textos={anuncio.titulos} limite={LIMITE_TITULO} />
        <ListaDeTextos titulo="Descrições" textos={anuncio.descricoes} limite={LIMITE_DESCRICAO} />
      </div>

      <div className="flex flex-col gap-2 rounded-card border border-dashed border-borda p-4 text-texto-suave">
        <strong className="text-texto">Gerar sugestões com IA</strong>
        Na Fase 5 este anúncio ganha um botão para o Claude escrever novos títulos e descrições.
        {avaliado.palavrasDoGrupo.length > 0 && (
          <span className="text-[13px]">Palavras-chave do grupo: {avaliado.palavrasDoGrupo.join(", ")}</span>
        )}
      </div>
    </section>
  );
}
