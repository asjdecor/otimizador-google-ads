import { iaConfiguradaNoAmbiente } from "@/api/integracoes/fabrica";
import { claudeEstaConfigurado, openaiEstaConfigurado } from "@/api/configuracao/ambiente";
import { carregarContextoDaConta } from "@/api/http/contexto-da-conta";
import { traduzirErroGoogleAds } from "@/api/integracoes/google-ads/erros";
import { lerUltimaAnaliseDeTermos } from "@/api/servicos/analise-de-termos";
import { carregarDadosDosTermos, type DadosDosTermos } from "@/api/servicos/dados-de-termos";
import { formatarData, formatarMoeda, formatarNumero } from "@/api/servicos/formatacao";
import { Aviso } from "@/componentes/Aviso";
import { AvisoSemConta } from "@/componentes/AvisoSemConta";
import { CardMetrica } from "@/componentes/CardMetrica";
import { PainelAnaliseDeTermos } from "@/componentes/PainelAnaliseDeTermos";
import { PainelAnalisePremium } from "@/componentes/PainelAnalisePremium";
import { TabelaDados } from "@/componentes/TabelaDados";
import { TabelaDeNegativas, TabelaDePalavrasNovas } from "@/componentes/TabelasDeTermos";

export const dynamic = "force-dynamic";

const NOMES_SITUACAO: Record<string, string> = {
  ADICIONADO: "Já é palavra-chave",
  EXCLUIDO: "Excluído",
  ADICIONADO_E_EXCLUIDO: "Adicionado e excluído",
  NENHUMA: "—",
};

export default async function PaginaPalavrasChave() {
  const contexto = await carregarContextoDaConta();
  if (contexto.tipo === "desconectado" || contexto.tipo === "sem-conta") {
    return <AvisoSemConta titulo="Palavras-chave" motivo={contexto.tipo} />;
  }

  let dados: DadosDosTermos | null = null;
  let erro = contexto.tipo === "erro" ? contexto.mensagem : null;
  if (contexto.tipo === "pronto") {
    try {
      dados = await carregarDadosDosTermos(contexto);
    } catch (falha) {
      erro = traduzirErroGoogleAds(falha);
    }
  }
  const analise = await lerUltimaAnaliseDeTermos(contexto.conta.customerId);
  const moeda = contexto.conta.moeda || "BRL";
  const provedoresPremiumConfigurados = [
    ...(claudeEstaConfigurado() ? ["Claude"] : []),
    ...(openaiEstaConfigurado() ? ["OpenAI"] : []),
  ];

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1>Palavras-chave</h1>
        <p className="text-texto-suave">
          Termos que as pessoas pesquisaram e que mostraram seus anúncios
          {dados ? `, de ${formatarData(dados.intervalo.inicio)} a ${formatarData(dados.intervalo.fim)}` : ""}. Nada é
          alterado no Google Ads: exporte o CSV e importe no Google Ads Editor, ou aplique à mão.
        </p>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {dados && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <CardMetrica rotulo="Termos de pesquisa" valor={formatarNumero(dados.termos.length)} />
            <CardMetrica
              rotulo="Gasto em termos sem conversão"
              valor={formatarMoeda(dados.gastoSemConversao, moeda)}
              destaque={dados.gastoSemConversao > 0 ? "erro" : "apoio"}
            />
            <CardMetrica rotulo="Negativas sugeridas" valor={formatarNumero(dados.negativasPorRegra.length)} />
            <CardMetrica rotulo="Palavras novas sugeridas" valor={formatarNumero(dados.novasPorRegra.length)} />
          </div>

          <div className="flex flex-col gap-2">
            <h2>Negativas sugeridas</h2>
            <p className="text-texto-suave">
              Termos que custaram e não converteram nenhuma vez. Revise: alguns podem só precisar de mais tempo.
            </p>
            <TabelaDeNegativas
              titulo="Negativas sugeridas por regra"
              negativas={dados.negativasPorRegra}
              moeda={moeda}
              nomeDoArquivo="negativas.csv"
              mensagemVazia="Nenhum termo gastou sem converter neste período. 👍"
            />
          </div>

          <div className="flex flex-col gap-2">
            <h2>Novas palavras-chave sugeridas</h2>
            <p className="text-texto-suave">
              Termos que já trouxeram conversão e ainda não são palavra-chave. 2+ conversões → exata; 1 → frase.
            </p>
            <TabelaDePalavrasNovas
              titulo="Palavras novas sugeridas por regra"
              palavras={dados.novasPorRegra}
              moeda={moeda}
              nomeDoArquivo="palavras-novas.csv"
              mensagemVazia="Nenhum termo novo converteu neste período."
            />
          </div>
        </>
      )}

      <PainelAnaliseDeTermos analiseInicial={analise} iaConfigurada={iaConfiguradaNoAmbiente()} moeda={moeda} />
      <PainelAnalisePremium provedoresConfigurados={provedoresPremiumConfigurados} moeda={moeda} />

      {dados && (
        <div className="flex flex-col gap-2">
          <h2>Todos os termos de pesquisa</h2>
          <TabelaDados
            titulo="Termos de pesquisa"
            moeda={moeda}
            ordemInicial={{ coluna: "custo", direcao: "desc" }}
            mensagemVazia="Nenhum termo de pesquisa neste período."
            colunas={[
              { chave: "termo", titulo: "Termo", formato: "texto" },
              { chave: "situacao", titulo: "Situação", formato: "texto" },
              { chave: "local", titulo: "Campanha › Grupo", formato: "texto" },
              { chave: "cliques", titulo: "Cliques", formato: "numero" },
              { chave: "custo", titulo: "Custo", formato: "moeda" },
              { chave: "conversoes", titulo: "Conv.", formato: "numero" },
            ]}
            linhas={dados.termos.map((t) => ({
              chave: `${t.grupoId}-${t.termo}`,
              termo: t.termo,
              situacao: NOMES_SITUACAO[t.situacao] ?? "—",
              local: `${t.campanhaNome} › ${t.grupoNome}`,
              cliques: t.cliques,
              custo: t.custo,
              conversoes: t.conversoes,
            }))}
          />
        </div>
      )}
    </section>
  );
}
