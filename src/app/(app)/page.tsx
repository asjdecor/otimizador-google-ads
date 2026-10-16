import { carregarContextoDaConta } from "@/api/http/contexto-da-conta";
import { traduzirErroGoogleAds } from "@/api/integracoes/google-ads/erros";
import { montarIdDoAnuncio } from "@/api/servicos/anuncios";
import { REGRA_CTR_BAIXO } from "@/api/servicos/desperdicio";
import {
  formatarData,
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
} from "@/api/servicos/formatacao";
import { carregarDadosDoPainel, type DadosDoPainel } from "@/api/servicos/painel";
import { Aviso } from "@/componentes/Aviso";
import { AvisoSemConta } from "@/componentes/AvisoSemConta";
import { CardMetrica } from "@/componentes/CardMetrica";
import { FormularioLimite } from "@/componentes/FormularioLimite";
import { TabelaDados } from "@/componentes/TabelaDados";

export const dynamic = "force-dynamic";

export default async function PaginaPainel() {
  const contexto = await carregarContextoDaConta();
  if (contexto.tipo === "desconectado" || contexto.tipo === "sem-conta") {
    return <AvisoSemConta titulo="Painel" motivo={contexto.tipo} />;
  }
  const { conta, configuracao, periodo } = contexto;

  let dados: DadosDoPainel | null = null;
  let erro = contexto.tipo === "erro" ? contexto.mensagem : null;
  if (contexto.tipo === "pronto") {
    try {
      dados = await carregarDadosDoPainel({ ...contexto, limiteDesperdicio: configuracao.limiteDesperdicio });
    } catch (falha) {
      erro = traduzirErroGoogleAds(falha);
    }
  }

  const moeda = conta.moeda || "BRL";
  const dinheiro = (valor: number | null) => formatarMoeda(valor, moeda);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1>Painel</h1>
        <p className="text-texto-suave">
          {conta.nome} ·{" "}
          {dados
            ? `${formatarData(dados.intervalo.inicio)} a ${formatarData(dados.intervalo.fim)}`
            : `últimos ${periodo} dias`}
        </p>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <CardMetrica rotulo="Custo" valor={dados && dinheiro(dados.totais.custo)} erro={!!erro} />
        <CardMetrica rotulo="Cliques" valor={dados && formatarNumero(dados.totais.cliques)} erro={!!erro} />
        <CardMetrica rotulo="CTR" valor={dados && formatarPercentual(dados.totais.ctr)} erro={!!erro} />
        <CardMetrica rotulo="CPC médio" valor={dados && dinheiro(dados.totais.cpcMedio)} erro={!!erro} />
        <CardMetrica rotulo="Conversões" valor={dados && formatarNumero(dados.totais.conversoes)} erro={!!erro} />
        <CardMetrica rotulo="Custo / conversão" valor={dados && dinheiro(dados.totais.custoPorConversao)} erro={!!erro} />
      </div>

      {dados && (
        <>
          <CardMetrica
            rotulo="Gasto em palavras-chave sem nenhuma conversão"
            valor={dinheiro(dados.gastoSemConversao)}
            destaque={dados.gastoSemConversao > 0 ? "erro" : "apoio"}
            legenda={
              dados.totais.custo > 0
                ? `${formatarPercentual(dados.gastoSemConversao / dados.totais.custo)} do custo total do período`
                : undefined
            }
          />

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2>Palavras-chave que desperdiçam verba</h2>
                <p className="text-texto-suave">
                  Custo acima de {dinheiro(configuracao.limiteDesperdicio)} e nenhuma conversão no período.
                </p>
              </div>
              <FormularioLimite limiteAtual={configuracao.limiteDesperdicio} />
            </div>
            <TabelaDados
              titulo="Palavras-chave que desperdiçam verba"
              moeda={moeda}
              mensagemVazia="Nenhuma palavra-chave passou do limite sem converter. 👍"
              colunas={[
                { chave: "texto", titulo: "Palavra-chave", formato: "texto" },
                { chave: "correspondencia", titulo: "Corresp.", formato: "texto" },
                { chave: "local", titulo: "Campanha › Grupo", formato: "texto" },
                { chave: "cliques", titulo: "Cliques", formato: "numero" },
                { chave: "custo", titulo: "Custo", formato: "moeda" },
              ]}
              linhas={dados.palavrasQueDesperdicam.map((p) => ({
                chave: `${p.grupoId}-${p.criterioId}`,
                texto: p.texto,
                correspondencia: p.correspondencia,
                local: `${p.campanhaNome} › ${p.grupoNome}`,
                cliques: p.cliques,
                custo: p.custo,
                destaque: 1,
              }))}
            />
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <h2>Anúncios com CTR abaixo da média do grupo</h2>
              <p className="text-texto-suave">
                CTR menor que {REGRA_CTR_BAIXO.fatorDaMedia * 100}% do CTR do grupo, com
                pelo menos {REGRA_CTR_BAIXO.impressoesMinimas} impressões.
              </p>
            </div>
            <TabelaDados
              titulo="Anúncios com CTR baixo"
              moeda={moeda}
              colunaComLink="titulo"
              mensagemVazia="Nenhum anúncio muito abaixo da média do seu grupo. 👍"
              colunas={[
                { chave: "titulo", titulo: "Anúncio (1º título)", formato: "texto" },
                { chave: "local", titulo: "Campanha › Grupo", formato: "texto" },
                { chave: "impressoes", titulo: "Impressões", formato: "numero" },
                { chave: "ctr", titulo: "CTR", formato: "percentual" },
                { chave: "ctrGrupo", titulo: "CTR do grupo", formato: "percentual" },
              ]}
              linhas={dados.anunciosComCtrBaixo.map((a) => ({
                chave: `${a.grupoId}-${a.anuncioId}`,
                href: `/anuncios/${montarIdDoAnuncio(a.grupoId, a.anuncioId)}`,
                titulo: a.titulo,
                local: `${a.campanhaNome} › ${a.grupoNome}`,
                impressoes: a.impressoes,
                ctr: a.ctr,
                ctrGrupo: a.ctrMedioDoGrupo,
                destaque: 1,
              }))}
            />
          </div>

          <div className="flex flex-col gap-3">
            <h2>Campanhas</h2>
            <TabelaDados
              titulo="Campanhas"
              moeda={moeda}
              ordemInicial={{ coluna: "custo", direcao: "desc" }}
              colunas={[
                { chave: "nome", titulo: "Campanha", formato: "texto" },
                { chave: "status", titulo: "Status", formato: "texto" },
                { chave: "impressoes", titulo: "Impressões", formato: "numero" },
                { chave: "cliques", titulo: "Cliques", formato: "numero" },
                { chave: "ctr", titulo: "CTR", formato: "percentual" },
                { chave: "cpcMedio", titulo: "CPC médio", formato: "moeda" },
                { chave: "custo", titulo: "Custo", formato: "moeda" },
                { chave: "conversoes", titulo: "Conv.", formato: "numero" },
                { chave: "custoPorConversao", titulo: "Custo/conv.", formato: "moeda" },
              ]}
              linhas={dados.campanhas.map((c) => ({
                chave: c.campanhaId,
                nome: c.nome,
                status: c.status,
                impressoes: c.impressoes,
                cliques: c.cliques,
                ctr: c.ctr,
                cpcMedio: c.cpcMedio,
                custo: c.custo,
                conversoes: c.conversoes,
                custoPorConversao: c.custoPorConversao,
              }))}
            />
          </div>
        </>
      )}
    </section>
  );
}
