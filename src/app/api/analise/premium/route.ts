import { NextResponse } from "next/server";
import { z } from "zod";
import { claudeEstaConfigurado, lerConfiguracaoClaude, lerConfiguracaoOpenAI, openaiEstaConfigurado } from "@/api/configuracao/ambiente";
import { carregarContextoDaConta } from "@/api/http/contexto-da-conta";
import { barrarOutraOrigem, responderErro, responderErroExterno } from "@/api/http/respostas";
import { criarGeradorClaude } from "@/api/integracoes/claude/cliente";
import { traduzirErroGoogleAds } from "@/api/integracoes/google-ads/erros";
import { buscarIdeiasDePalavras, type IdeiaDePalavra } from "@/api/integracoes/google-ads/planejador";
import { buscarDominioPrincipal, buscarSegmentacao } from "@/api/integracoes/google-ads/segmentacao";
import { criarGeradorOpenAI } from "@/api/integracoes/openai/cliente";
import {
  analisarComIasPremium,
  type EntradaAnalisePremium,
  type PalavraChaveAnalisePremium,
  type ProvedorDeAnalisePremium,
} from "@/api/servicos/analise-premium";
import { carregarDadosDoPainel } from "@/api/servicos/painel";
import { calcularIntervaloDoPeriodo } from "@/api/servicos/periodo";
import { lerUltimaPesquisa } from "@/api/servicos/pesquisa-de-mercado";
import { carregarDadosDosTermos } from "@/api/servicos/dados-de-termos";
import { normalizarTexto } from "@/api/servicos/diagnostico";

export const maxDuration = 60;

const esquemaCorpo = z.object({
  contexto: z.string().max(1000).optional(),
  objetivo: z.string().max(300).optional(),
});

const GEOGRAFIA_PADRAO_BRASIL = "2076";
const IDIOMA_PADRAO_PORTUGUES = "1014";

export async function POST(requisicao: Request) {
  const bloqueio = barrarOutraOrigem(requisicao);
  if (bloqueio) return bloqueio;

  const corpo = esquemaCorpo.safeParse(await requisicao.json().catch(() => null));
  if (!corpo.success) return responderErro("Confira o contexto e o objetivo da análise e tente novamente.");

  const conta = await carregarContextoDaConta();
  if (conta.tipo !== "pronto") return responderErro(conta.tipo === "erro" ? conta.mensagem : "Conecte e escolha uma conta.");

  const provedores: ProvedorDeAnalisePremium[] = [];
  if (claudeEstaConfigurado()) {
    const gerador = criarGeradorClaude(lerConfiguracaoClaude());
    provedores.push({ nome: "Claude", gerarJson: (pedido) => gerador.gerarJson(pedido) });
  }
  if (openaiEstaConfigurado()) {
    const gerador = criarGeradorOpenAI(lerConfiguracaoOpenAI());
    provedores.push({ nome: "OpenAI", gerarJson: (pedido) => gerador.gerarJson(pedido) });
  }
  if (provedores.length === 0) {
    return responderErro("Configure ANTHROPIC_API_KEY e/ou OPENAI_API_KEY no ambiente para executar a análise.", 503);
  }

  try {
    const { api, credenciais, periodo, configuracao } = conta;
    const [dadosTermos, dadosPainel, segmentacao, dominio, pesquisa] = await Promise.all([
      carregarDadosDosTermos({ api, credenciais, periodo }),
      carregarDadosDoPainel({ api, credenciais, periodo, limiteDesperdicio: configuracao.limiteDesperdicio }),
      buscarSegmentacao(api, credenciais),
      buscarDominioPrincipal(api, credenciais),
      lerUltimaPesquisa(conta.conta.customerId),
    ]);

    const sementes = [
      ...new Set([
        ...Object.values(dadosTermos.palavrasPorGrupo).flat(),
        ...[...dadosTermos.termos].sort((a, b) => b.custo - a.custo).map((termo) => termo.termo),
      ]),
    ].slice(0, 10);
    const ideiasPlanejador: IdeiaDePalavra[] = [];
    let avisoPlanejador: string | null = null;
    if (dominio || sementes.length > 0) {
      try {
        const ideias = await buscarIdeiasDePalavras(api, credenciais, {
          ...(dominio ? { urlSemente: `https://${dominio}` } : {}),
          palavrasSemente: sementes,
          idsGeo: segmentacao.idsGeo.length > 0 ? segmentacao.idsGeo : [GEOGRAFIA_PADRAO_BRASIL],
          idioma: segmentacao.idiomas[0] ?? IDIOMA_PADRAO_PORTUGUES,
        });
        ideiasPlanejador.push(...ideias.slice(0, 100));
        if (ideiasPlanejador.length === 0) {
          avisoPlanejador = "O Planejador não retornou ideias para as sementes atuais.";
        } else if (ideiasPlanejador.every((ideia) => ideia.volumeMensal === null)) {
          avisoPlanejador = "O Planejador retornou ideias, mas sem volume mensal para esta conta.";
        }
      } catch (erro) {
        avisoPlanejador = traduzirErroGoogleAds(erro);
      }
    } else {
      avisoPlanejador = "Sem site ou palavras de origem suficientes para consultar o Planejador.";
    }

    const metricasDePesquisa = new Map<string, { termo: string; custo: number; cliques: number; conversoes: number }>();
    for (const termo of dadosTermos.termos) {
      const chave = normalizarTexto(termo.termo);
      const atual = metricasDePesquisa.get(chave);
      metricasDePesquisa.set(chave, {
        termo: atual?.termo ?? termo.termo,
        custo: (atual?.custo ?? 0) + termo.custo,
        cliques: (atual?.cliques ?? 0) + termo.cliques,
        conversoes: (atual?.conversoes ?? 0) + termo.conversoes,
      });
    }

    const palavrasPorChave = new Map<string, PalavraChaveAnalisePremium>(
      ideiasPlanejador.map((ideia) => [
        normalizarTexto(ideia.texto),
        {
          termo: ideia.texto,
          volumeMensal: ideia.volumeMensal ?? undefined,
          concorrencia:
            ideia.concorrencia === "BAIXA"
              ? "baixa" as const
              : ideia.concorrencia === "MEDIA"
                ? "media" as const
                : ideia.concorrencia === "ALTA"
                  ? "alta" as const
                  : undefined,
          lanceAltoGoogle: ideia.lanceAlto ?? undefined,
        },
      ]),
    );
    const termosOrdenados = [...metricasDePesquisa.values()].sort((a, b) => b.custo - a.custo);
    for (const termo of termosOrdenados.slice(0, 100)) {
      const chave = normalizarTexto(termo.termo);
      const atual = palavrasPorChave.get(chave);
      palavrasPorChave.set(chave, {
        termo: atual?.termo ?? termo.termo,
        volumeMensal: atual?.volumeMensal,
        concorrencia: atual?.concorrencia,
        lanceAltoGoogle: atual?.lanceAltoGoogle,
        cpcObservado: termo.cliques > 0 ? termo.custo / termo.cliques : undefined,
        cliques: termo.cliques,
        conversoes: termo.conversoes,
      });
    }

    const entrada: EntradaAnalisePremium = {
      palavrasChave: [...palavrasPorChave.values()],
      campanhas: dadosPainel.campanhas.map((campanha) => ({
        nome: campanha.nome,
        impressoes: campanha.impressoes,
        cliques: campanha.cliques,
        custo: campanha.custo,
        conversoes: campanha.conversoes,
        ctr: campanha.ctr ?? undefined,
        cpc: campanha.cpcMedio ?? undefined,
        custoPorConversao: campanha.custoPorConversao ?? undefined,
        status: campanha.status,
        palavras: dadosTermos.termos
          .filter((termo) => termo.campanhaNome === campanha.nome)
          .slice(0, 10)
          .map((termo) => termo.termo),
      })),
      concorrentes: (pesquisa?.relatorios ?? []).map((relatorio) => ({
        nome: relatorio.site,
        dominio: relatorio.dominio,
        pontosFortes: relatorio.diferenciais,
      })),
      contexto: corpo.data.contexto?.trim() || undefined,
      objetivo: corpo.data.objetivo?.trim() || undefined,
    };

    if (entrada.palavrasChave.length === 0 && entrada.campanhas.length === 0) {
      return responderErro("Não há métricas ou palavras-chave suficientes para uma análise. Amplie o período e tente novamente.");
    }

    const analise = await analisarComIasPremium(provedores, entrada);
    const intervalo = calcularIntervaloDoPeriodo(periodo);
    return NextResponse.json({
      analise: {
        ...analise,
        avisos: avisoPlanejador ? [...analise.avisos, `Planejador de Palavras-chave: ${avisoPlanejador}`] : analise.avisos,
      },
      fontes: {
        periodo: `${intervalo.inicio} a ${intervalo.fim}`,
        totalIdeiasPlanejador: ideiasPlanejador.length,
        totalTermosPesquisa: dadosTermos.termos.length,
        totalCampanhas: dadosPainel.campanhas.length,
        totalConcorrentes: entrada.concorrentes?.length ?? 0,
        ideiasPlanejador: ideiasPlanejador.slice(0, 30).map((ideia) => ({
          texto: ideia.texto,
          volumeMensal: ideia.volumeMensal,
          concorrencia: ideia.concorrencia,
          lanceAlto: ideia.lanceAlto,
        })),
      },
    });
  } catch (erro) {
    return responderErroExterno(erro);
  }
}
