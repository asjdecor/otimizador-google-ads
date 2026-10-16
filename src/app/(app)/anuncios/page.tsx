import { carregarContextoDaConta } from "@/api/http/contexto-da-conta";
import { traduzirErroGoogleAds } from "@/api/integracoes/google-ads/erros";
import { carregarAnunciosAvaliados, type AnuncioAvaliado } from "@/api/servicos/anuncios";
import { formatarData } from "@/api/servicos/formatacao";
import type { IntervaloDeDatas } from "@/api/servicos/periodo";
import { Aviso } from "@/componentes/Aviso";
import { AvisoSemConta } from "@/componentes/AvisoSemConta";
import { TabelaDados } from "@/componentes/TabelaDados";

export const dynamic = "force-dynamic";

const NOMES_FORCA: Record<string, string> = {
  EXCELENTE: "Excelente",
  BOA: "Boa",
  MEDIA: "Média",
  RUIM: "Ruim",
  PENDENTE: "Em análise",
  SEM_DADOS: "—",
};

export default async function PaginaAnuncios() {
  const contexto = await carregarContextoDaConta();
  if (contexto.tipo === "desconectado" || contexto.tipo === "sem-conta") {
    return <AvisoSemConta titulo="Anúncios" motivo={contexto.tipo} />;
  }

  let resultado: { intervalo: IntervaloDeDatas; anuncios: AnuncioAvaliado[] } | null = null;
  let erro = contexto.tipo === "erro" ? contexto.mensagem : null;
  if (contexto.tipo === "pronto") {
    try {
      resultado = await carregarAnunciosAvaliados(contexto);
    } catch (falha) {
      erro = traduzirErroGoogleAds(falha);
    }
  }

  const ruins = resultado?.anuncios.filter((a) => a.diagnostico.classificacao === "Ruim").length ?? 0;
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1>Anúncios</h1>
        <p className="text-texto-suave">
          Anúncios responsivos de pesquisa de {contexto.conta.nome}, com nota de 0 a 100. Métricas de{" "}
          {resultado
            ? `${formatarData(resultado.intervalo.inicio)} a ${formatarData(resultado.intervalo.fim)}`
            : `últimos ${contexto.periodo} dias`}
          .
        </p>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {resultado && ruins > 0 && (
        <Aviso tipo="aviso">
          {ruins} {ruins === 1 ? "anúncio está" : "anúncios estão"} com nota ruim. Comece por {ruins === 1 ? "ele" : "eles"}:
          a lista já vem das piores notas para as melhores.
        </Aviso>
      )}

      {resultado && (
        <TabelaDados
          titulo="Anúncios com nota"
          moeda={contexto.conta.moeda || "BRL"}
          colunaComLink="titulo"
          mensagemVazia="Nenhum anúncio responsivo de pesquisa nesta conta."
          colunas={[
            { chave: "nota", titulo: "Nota", formato: "numero" },
            { chave: "classificacao", titulo: "Situação", formato: "texto" },
            { chave: "titulo", titulo: "Anúncio (1º título)", formato: "texto" },
            { chave: "local", titulo: "Campanha › Grupo", formato: "texto" },
            { chave: "forca", titulo: "Força (Google)", formato: "texto" },
            { chave: "impressoes", titulo: "Impressões", formato: "numero" },
            { chave: "ctr", titulo: "CTR", formato: "percentual" },
            { chave: "conversoes", titulo: "Conv.", formato: "numero" },
          ]}
          linhas={resultado.anuncios.map((a) => ({
            chave: a.id,
            href: `/anuncios/${a.id}`,
            nota: a.diagnostico.nota,
            classificacao: a.diagnostico.classificacao,
            titulo: a.anuncio.titulos[0] ?? `Anúncio ${a.anuncio.anuncioId}`,
            local: `${a.anuncio.campanhaNome} › ${a.anuncio.grupoNome}`,
            forca: NOMES_FORCA[a.anuncio.forca] ?? "—",
            impressoes: a.metricas?.impressoes ?? null,
            ctr: a.metricas?.ctr ?? null,
            conversoes: a.metricas?.conversoes ?? null,
            destaque: a.diagnostico.classificacao === "Ruim" ? 1 : 0,
          }))}
        />
      )}
    </section>
  );
}
