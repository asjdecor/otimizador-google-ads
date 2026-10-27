// Conta de demonstração (loja de sofás) para o teste e2e e para ver o app sem chaves.
// Só é usada com APP_DADOS_FALSOS=1 fora de produção (ver ../fabrica.ts).

const reais = (valor: number) => Math.round(valor * 1_000_000);

export const ID_MCC_DEMO = "9000000000";

const CONTAS = [
  { customer_client: { id: 9000000000, descriptive_name: "Agência Demo (MCC)", currency_code: "BRL", manager: true, level: 0 } },
  { customer_client: { id: 1112223333, descriptive_name: "Loja Demo - Sofás", currency_code: "BRL", manager: false, level: 1 } },
  { customer_client: { id: 4445556666, descriptive_name: "Loja Demo - Colchões", currency_code: "BRL", manager: false, level: 1 } },
];

const CAMPANHAS = [
  { campaign: { id: 1, name: "Pesquisa - Sofás", status: 2 }, metrics: { impressions: 12000, clicks: 480, cost_micros: reais(2400), conversions: 24 } },
  { campaign: { id: 2, name: "Pesquisa - Poltronas", status: 3 }, metrics: { impressions: 3000, clicks: 60, cost_micros: reais(450), conversions: 1 } },
];

const grupoSofas = { id: 10, name: "Sofás retráteis" };
const grupoPoltronas = { id: 20, name: "Poltronas" };

const PALAVRAS_COM_METRICAS = [
  { ad_group_criterion: { criterion_id: 501, keyword: { text: "sofá retrátil", match_type: 3 } }, ad_group: grupoSofas, campaign: { name: "Pesquisa - Sofás" }, metrics: { impressions: 7000, clicks: 300, cost_micros: reais(1500), conversions: 22 } },
  { ad_group_criterion: { criterion_id: 502, keyword: { text: "sofá barato", match_type: 4 } }, ad_group: grupoSofas, campaign: { name: "Pesquisa - Sofás" }, metrics: { impressions: 4000, clicks: 150, cost_micros: reais(820), conversions: 0 } },
  { ad_group_criterion: { criterion_id: 503, keyword: { text: "sofá de luxo", match_type: 2 } }, ad_group: grupoSofas, campaign: { name: "Pesquisa - Sofás" }, metrics: { impressions: 1000, clicks: 30, cost_micros: reais(80), conversions: 0 } },
  { ad_group_criterion: { criterion_id: 601, keyword: { text: "poltrona", match_type: 3 } }, ad_group: grupoPoltronas, campaign: { name: "Pesquisa - Poltronas" }, metrics: { impressions: 3000, clicks: 60, cost_micros: reais(450), conversions: 1 } },
];

const METRICAS_DE_ANUNCIOS = [
  { ad_group_ad: { ad: { id: 101, responsive_search_ad: { headlines: [{ text: "Sofá Retrátil Sob Medida" }] } } }, ad_group: grupoSofas, campaign: { name: "Pesquisa - Sofás" }, metrics: { impressions: 7000, clicks: 420, cost_micros: reais(2000), conversions: 22 } },
  { ad_group_ad: { ad: { id: 102, responsive_search_ad: { headlines: [{ text: "Móveis Para Sua Casa" }] } } }, ad_group: grupoSofas, campaign: { name: "Pesquisa - Sofás" }, metrics: { impressions: 5000, clicks: 60, cost_micros: reais(400), conversions: 2 } },
];

const ANUNCIOS_RSA = [
  {
    ad_group_ad: {
      ad: {
        id: 101,
        responsive_search_ad: {
          headlines: [
            "Sofá Retrátil Sob Medida", "Entrega em Até 15 Dias", "Parcele em 10x", "Tecidos Impermeáveis", "Fábrica Própria em SP",
            "Garantia de 5 Anos", "Peça Seu Orçamento Hoje", "Mais de 2 Mil Clientes", "Projeto 3D Grátis", "Showroom na Zona Sul",
          ].map((text) => ({ text })),
          descriptions: [
            "Sofás retráteis sob medida para a sua sala. Escolha tecido, cor e tamanho.",
            "Fábrica própria: preço justo e entrega rápida. Peça seu orçamento pelo WhatsApp.",
            "Tecidos impermeáveis e antimanchas, ideais para quem tem pets e crianças.",
            "Garantia de 5 anos na estrutura. Visite nosso showroom na Zona Sul de SP.",
          ].map((text) => ({ text })),
        },
        final_urls: ["https://loja-demo.example/sofas"],
      },
      ad_strength: 6,
      status: 2,
    },
    ad_group: grupoSofas,
    campaign: { name: "Pesquisa - Sofás" },
  },
  {
    ad_group_ad: {
      ad: {
        id: 102,
        responsive_search_ad: {
          headlines: [{ text: "Móveis Para Sua Casa" }, { text: "móveis para sua casa!" }, { text: "Os Melhores Móveis Da Cidade Inteira" }],
          descriptions: [{ text: "Temos móveis de qualidade." }],
        },
        final_urls: ["https://loja-demo.example/"],
      },
      ad_strength: 4,
      status: 2,
    },
    ad_group: grupoSofas,
    campaign: { name: "Pesquisa - Sofás" },
  },
];

const PALAVRAS_DOS_GRUPOS = [
  { ad_group: grupoSofas, ad_group_criterion: { keyword: { text: "sofá retrátil" } } },
  { ad_group: grupoSofas, ad_group_criterion: { keyword: { text: "sofá barato" } } },
  { ad_group: grupoSofas, ad_group_criterion: { keyword: { text: "sofá de luxo" } } },
  { ad_group: grupoPoltronas, ad_group_criterion: { keyword: { text: "poltrona" } } },
];

const TERMOS = [
  { search_term_view: { search_term: "sofá grátis doação", status: 5 }, ad_group: grupoSofas, campaign: { name: "Pesquisa - Sofás" }, metrics: { impressions: 900, clicks: 15, cost_micros: reais(45), conversions: 0 } },
  { search_term_view: { search_term: "conserto de sofá", status: 5 }, ad_group: grupoSofas, campaign: { name: "Pesquisa - Sofás" }, metrics: { impressions: 600, clicks: 10, cost_micros: reais(30), conversions: 0 } },
  { search_term_view: { search_term: "sofá retrátil 3 lugares", status: 5 }, ad_group: grupoSofas, campaign: { name: "Pesquisa - Sofás" }, metrics: { impressions: 1200, clicks: 40, cost_micros: reais(120), conversions: 4 } },
  { search_term_view: { search_term: "sofá retrátil", status: 2 }, ad_group: grupoSofas, campaign: { name: "Pesquisa - Sofás" }, metrics: { impressions: 5000, clicks: 200, cost_micros: reais(900), conversions: 15 } },
  { search_term_view: { search_term: "poltrona do papai", status: 5 }, ad_group: grupoPoltronas, campaign: { name: "Pesquisa - Poltronas" }, metrics: { impressions: 300, clicks: 8, cost_micros: reais(25), conversions: 1 } },
];

const SEGMENTACAO = [
  { campaign_criterion: { type: 7, negative: false, location: { geo_target_constant: "geoTargetConstants/1001773" } } },
  { campaign_criterion: { type: 20, negative: false, language: { language_constant: "languageConstants/1014" } } },
];

const NOMES_GEO = [{ geo_target_constant: { canonical_name: "São Paulo,São Paulo,Brazil" } }];

const URLS_FINAIS = [
  { ad_group_ad: { ad: { final_urls: ["https://www.sofas-demo.example/sofas"] } } },
  { ad_group_ad: { ad: { final_urls: ["https://www.sofas-demo.example/poltronas"] } } },
];

/** Responde cada GAQL do app com os dados acima (a ordem dos testes importa: o mais específico primeiro). */
export function responderConsultaDeDemonstracao(gaql: string): unknown[] {
  if (gaql.includes("FROM customer_client")) return CONTAS;
  if (gaql.includes("FROM campaign_criterion")) return SEGMENTACAO; // antes de "FROM campaign"
  if (gaql.includes("FROM geo_target_constant")) return NOMES_GEO;
  if (gaql.includes("FROM campaign")) return CAMPANHAS;
  if (gaql.includes("FROM keyword_view")) return PALAVRAS_COM_METRICAS;
  if (gaql.includes("RESPONSIVE_SEARCH_AD")) return ANUNCIOS_RSA;
  if (gaql.includes("FROM ad_group_criterion")) return PALAVRAS_DOS_GRUPOS;
  if (gaql.includes("SELECT ad_group_ad.ad.final_urls")) return URLS_FINAIS;
  if (gaql.includes("FROM ad_group_ad")) return METRICAS_DE_ANUNCIOS;
  if (gaql.includes("FROM search_term_view")) return TERMOS;
  return [];
}

/** Ideias do Planejador de Palavras-chave, no formato cru da API (a loja de sofás de São Paulo). */
export const IDEIAS_DE_DEMONSTRACAO: unknown[] = [
  { text: "sofá retrátil", keyword_idea_metrics: { avg_monthly_searches: 12100, competition: 4, low_top_of_page_bid_micros: reais(1.23), high_top_of_page_bid_micros: reais(4.56) } },
  { text: "sofá 3 lugares", keyword_idea_metrics: { avg_monthly_searches: 8100, competition: 3, low_top_of_page_bid_micros: reais(0.9), high_top_of_page_bid_micros: reais(3.2) } },
  { text: "sofá cama", keyword_idea_metrics: { avg_monthly_searches: 14800, competition: 4, low_top_of_page_bid_micros: reais(1.1), high_top_of_page_bid_micros: reais(3.9) } },
  { text: "sofá de canto", keyword_idea_metrics: { avg_monthly_searches: 5400, competition: 3, low_top_of_page_bid_micros: reais(0.8), high_top_of_page_bid_micros: reais(2.7) } },
  { text: "sofá reclinável", keyword_idea_metrics: { avg_monthly_searches: 6600, competition: 2, low_top_of_page_bid_micros: reais(0.7), high_top_of_page_bid_micros: reais(2.4) } },
  { text: "sofá barato em são paulo", keyword_idea_metrics: { avg_monthly_searches: 720, competition: 2, low_top_of_page_bid_micros: reais(0.5), high_top_of_page_bid_micros: reais(1.8) } },
  { text: "loja de sofá zona sul", keyword_idea_metrics: { avg_monthly_searches: 210, competition: 2, low_top_of_page_bid_micros: reais(0.6), high_top_of_page_bid_micros: reais(1.5) } },
  { text: "limpeza de sofá", keyword_idea_metrics: { avg_monthly_searches: 9900, competition: 3, low_top_of_page_bid_micros: reais(0.4), high_top_of_page_bid_micros: reais(1.2) } },
  { text: "poltrona decorativa" },
];

/** Respostas fixas do "Claude" de demonstração, uma para cada tipo de pedido. */
export const RESPOSTAS_DA_IA_DE_DEMONSTRACAO: unknown[] = [
  {
    titulos: [
      "Sofá Retrátil em 10x", "Seu Sofá Sob Medida", "Peça Seu Orçamento", "Sofá Retrátil e Reclinável", "Entrega Rápida em SP",
      "Tecido Antimanchas", "Feito na Nossa Fábrica", "Agende uma Visita", "Sofá Que Cabe na Sala", "Conforto Para a Família",
      "Projeto em 3D Sem Custo", "Garantia de 5 Anos",
    ],
    descricoes: [
      "Sofás retráteis sob medida, com tecido à sua escolha. Peça seu orçamento agora.",
      "Fábrica própria em SP: preço justo, entrega rápida e garantia de 5 anos.",
      "Tecidos impermeáveis e antimanchas para quem tem pets e crianças em casa.",
      "Visite nosso showroom na Zona Sul e sente no seu próximo sofá.",
    ],
  },
  {
    negativas: [
      { termo: "sofá grátis doação", motivo: "Procura produto de graça; a loja vende sofás novos." },
      { termo: "conserto de sofá", motivo: "Busca por serviço de reparo, que a loja não oferece." },
    ],
    novas: [
      { texto: "sofá retrátil e reclinável", correspondencia: "FRASE", termo_de_origem: "sofá retrátil 3 lugares", motivo: "Variação comum de quem já converteu." },
      { texto: "poltrona reclinável", correspondencia: "FRASE", termo_de_origem: "poltrona do papai", motivo: "Sinônimo do termo que converteu." },
    ],
  },
];
