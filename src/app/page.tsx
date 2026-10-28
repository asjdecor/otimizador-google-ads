import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Otimizador Ads — clareza para investir melhor",
  description:
    "Entenda o desempenho do Google Ads com diagnósticos claros, desperdícios identificados e sugestões práticas. Você autoriza o acesso e mantém o controle.",
  robots: { index: true, follow: true },
};

const recursos = [
  {
    numero: "01",
    icone: "↗",
    titulo: "Encontre gastos sem retorno",
    texto: "Veja palavras-chave que consomem verba sem gerar conversões e entenda onde investigar primeiro.",
    cor: "bg-[#e9f8f2] text-[#16845d]",
  },
  {
    numero: "02",
    icone: "◎",
    titulo: "Leia a saúde das campanhas",
    texto: "Custo, cliques, CTR, CPC e conversões reunidos em uma visão simples de acompanhar.",
    cor: "bg-[#eeebff] text-[#6852d6]",
  },
  {
    numero: "03",
    icone: "✳",
    titulo: "Melhore seus anúncios com contexto",
    texto: "Receba diagnósticos explicados e ideias de texto para avaliar antes de qualquer mudança.",
    cor: "bg-[#fff3dd] text-[#b97816]",
  },
];

const passos = [
  { numero: "1", titulo: "Você autoriza", texto: "Entre com Google e escolha conceder acesso à conta que quer analisar." },
  { numero: "2", titulo: "O app organiza", texto: "As contas acessíveis são encontradas e a análise começa no painel." },
  { numero: "3", titulo: "Você decide", texto: "Leia os achados e escolha o que faz sentido aplicar na sua estratégia." },
];

function Seta() {
  return <span aria-hidden="true">↗</span>;
}

function GraficoDemonstrativo() {
  return (
    <div className="relative mx-auto w-full max-w-[540px] rounded-[26px] border border-white/15 bg-[#12182b]/95 p-4 shadow-[0_30px_90px_-30px_rgba(5,9,25,0.85)] backdrop-blur sm:p-6">
      <div className="absolute -right-3 -top-4 rounded-full border border-white/10 bg-[#1c2540] px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#c9c3ff] shadow-lg sm:right-4 sm:top-4">
        PRÉVIA DEMONSTRATIVA
      </div>
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5 pt-4 sm:pt-2">
        <div>
          <p className="text-xs font-medium text-white/50">VISÃO GERAL · ÚLTIMOS 30 DIAS</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-white sm:text-xl">Saúde da conta</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#15382f] px-3 py-1.5 text-xs font-semibold text-[#75e2b4]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#55d69e]" />
          Análise pronta
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Investimento", value: "R$ 8.420" },
          { label: "Cliques", value: "2.184" },
          { label: "Conversões", value: "146" },
          { label: "Custo / conv.", value: "R$ 57,67" },
        ].map((metrica) => (
          <div key={metrica.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
            <p className="text-[10px] font-medium text-white/45 sm:text-[11px]">{metrica.label}</p>
            <p className="mt-1 text-sm font-bold tracking-tight text-white sm:text-base">{metrica.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-white/85">Investimento e conversões</p>
            <p className="mt-0.5 text-[10px] text-white/40">Tendência ilustrativa</p>
          </div>
          <span className="rounded-lg bg-white/[0.06] px-2 py-1 text-[10px] text-white/55">30 dias</span>
        </div>
        <svg viewBox="0 0 500 140" role="img" aria-label="Gráfico ilustrativo de investimento e conversões" className="mt-3 h-28 w-full overflow-visible">
          <defs>
            <linearGradient id="area-investimento" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#8170ff" stopOpacity=".28" />
              <stop offset="100%" stopColor="#8170ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[25, 65, 105].map((y) => <line key={y} x1="0" x2="500" y1={y} y2={y} stroke="white" strokeOpacity=".08" strokeDasharray="3 6" />)}
          <path d="M0 104 C28 99 37 74 67 81 S106 110 135 88 S177 50 202 68 S244 90 270 58 S312 42 338 62 S375 83 400 48 S445 34 468 45 S489 29 500 24 V140 H0Z" fill="url(#area-investimento)" />
          <path d="M0 104 C28 99 37 74 67 81 S106 110 135 88 S177 50 202 68 S244 90 270 58 S312 42 338 62 S375 83 400 48 S445 34 468 45 S489 29 500 24" fill="none" stroke="#9a8cff" strokeWidth="3" strokeLinecap="round" />
          <path d="M0 117 C26 113 43 109 67 111 S112 99 135 103 S179 91 202 97 S246 84 270 88 S316 78 338 84 S376 66 400 74 S442 63 468 66 S487 58 500 57" fill="none" stroke="#55d69e" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 5" />
          <circle cx="400" cy="48" r="4" fill="#b6adff" stroke="#161b2b" strokeWidth="3" />
        </svg>
        <div className="mt-2 flex gap-4 text-[10px] text-white/50">
          <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#9a8cff]" />Investimento</span>
          <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#55d69e]" />Conversões</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#f0b94f]/20 bg-[#f0b94f]/[0.08] p-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0b94f]/15 text-lg text-[#f6c765]">✦</span>
        <div>
          <p className="text-xs font-bold text-white/90">Oportunidade para investigar</p>
          <p className="mt-0.5 text-[11px] leading-4 text-white/55">Termos com gasto e sem conversão no período.</p>
        </div>
        <span className="ml-auto text-white/35"><Seta /></span>
      </div>
      <p className="mt-3 text-center text-[10px] text-white/30">Números e gráficos fictícios, apenas para demonstrar a interface.</p>
    </div>
  );
}

export default function PaginaInicial() {
  return (
    <main className="overflow-hidden bg-white text-[#19212f]">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Otimizador Ads, início">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6454dd] text-lg font-black text-white shadow-lg shadow-[#6454dd]/20">a</span>
          <span className="text-[15px] font-extrabold tracking-[-0.04em]">otimizador<span className="text-[#6757dc]">ads</span></span>
        </Link>
        <nav aria-label="Navegação da página" className="hidden items-center gap-8 text-[13px] font-semibold text-[#707989] md:flex">
          <a className="transition hover:text-[#6454dd]" href="#recursos">Recursos</a>
          <a className="transition hover:text-[#6454dd]" href="#como-funciona">Como funciona</a>
          <a className="transition hover:text-[#6454dd]" href="#seguranca">Segurança</a>
        </nav>
        <Link href="/login" className="rounded-full border border-[#e1e4eb] px-4 py-2 text-xs font-bold text-[#333d4d] transition hover:border-[#6454dd] hover:text-[#6454dd] sm:px-5 sm:text-[13px]">
          Entrar
        </Link>
      </header>

      <section className="relative isolate overflow-hidden bg-[#11172a] text-white">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_12%_8%,rgba(98,79,222,0.25),transparent_40%),radial-gradient(ellipse_at_90%_80%,rgba(39,190,139,0.13),transparent_32%)]" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 lg:px-12 lg:pb-24 lg:pt-20">
          <div className="max-w-[590px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#c7c1ff] sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#59d7a2] shadow-[0_0_12px_#59d7a2]" />
              MAIS CLAREZA PARA SUAS DECISÕES
            </div>
            <h1 className="mt-6 max-w-[620px] text-[40px] font-extrabold leading-[1.06] tracking-[-0.055em] text-white sm:text-5xl lg:text-[58px] lg:leading-[1.04]">
              Seu Google Ads, <span className="bg-gradient-to-r from-[#b7acff] to-[#7f6dff] bg-clip-text text-transparent">sem pontos cegos.</span>
            </h1>
            <p className="mt-5 max-w-[510px] text-[15px] leading-7 text-[#b2b8c7] sm:text-base sm:leading-8">
              Descubra o que está funcionando, onde investigar desperdícios e como fortalecer seus anúncios — com explicações que ajudam você a decidir.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/login" className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#7564ef] px-6 text-sm font-bold text-white shadow-[0_12px_35px_-12px_rgba(117,100,239,.8)] transition hover:-translate-y-0.5 hover:bg-[#8576ff]">
                Analisar minha conta <span className="transition group-hover:translate-x-1"><Seta /></span>
              </Link>
              <a href="#como-funciona" className="inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold text-white/75 transition hover:text-white">
                Entenda como funciona <span className="ml-2 text-lg">↓</span>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-medium text-white/55 sm:text-xs">
              <span className="flex items-center gap-2"><span className="text-[#65d9a8]">✓</span> Você autoriza o acesso</span>
              <span className="flex items-center gap-2"><span className="text-[#65d9a8]">✓</span> Análise somente de leitura</span>
              <span className="flex items-center gap-2"><span className="text-[#65d9a8]">✓</span> Você decide o próximo passo</span>
            </div>
          </div>
          <GraficoDemonstrativo />
        </div>
        <div className="mx-auto max-w-7xl px-5 pb-8 sm:px-8 lg:px-12">
          <p className="border-t border-white/10 pt-5 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35 sm:text-left">Menos ruído nos relatórios. Mais contexto para agir.</p>
        </div>
      </section>

      <section id="recursos" className="scroll-mt-8 px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#6857df]">O que você ganha</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-[-0.045em] text-[#1b2433] sm:text-4xl">Dados que apontam para uma decisão.</h2>
            <p className="mt-4 text-sm leading-7 text-[#747e8d] sm:text-base">Uma leitura prática da conta para sair da planilha e entender onde colocar sua atenção.</p>
          </div>
          <div className="mt-11 grid gap-4 md:grid-cols-3 md:gap-5">
            {recursos.map((recurso) => (
              <article key={recurso.numero} className="group rounded-[22px] border border-[#e9ebf1] bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[#d9d3ff] hover:shadow-[0_18px_50px_-34px_rgba(57,47,140,.35)] sm:p-7">
                <div className="flex items-center justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl font-bold ${recurso.cor}`}>{recurso.icone}</span>
                  <span className="text-xs font-bold tracking-[0.12em] text-[#c4c9d2]">{recurso.numero}</span>
                </div>
                <h3 className="mt-6 text-lg font-extrabold tracking-[-0.025em] text-[#202a39]">{recurso.titulo}</h3>
                <p className="mt-2 text-[13px] leading-6 text-[#778190]">{recurso.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-8 bg-[#f6f7fb] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#6857df]">Simples e transparente</p>
            <h2 className="mt-3 max-w-lg text-3xl font-extrabold leading-tight tracking-[-0.045em] text-[#1b2433] sm:text-4xl">Você no controle, do começo ao fim.</h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-[#747e8d] sm:text-base">O app organiza as informações. A estratégia e qualquer mudança continuam nas suas mãos.</p>
            <Link href="/login" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#6554dd] hover:text-[#4534bf]">
              Começar uma análise <Seta />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {passos.map((passo) => (
              <article key={passo.numero} className="rounded-[20px] border border-[#e5e7ee] bg-white p-5 sm:p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efedff] text-sm font-extrabold text-[#6757dc]">{passo.numero}</span>
                <h3 className="mt-5 text-base font-extrabold text-[#202a39]">{passo.titulo}</h3>
                <p className="mt-2 text-[12px] leading-5 text-[#778190]">{passo.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="seguranca" className="scroll-mt-8 px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[28px] border border-[#e8e7f4] bg-gradient-to-br from-[#f8f7ff] via-white to-[#f3fbf8] p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center lg:p-12">
          <div className="max-w-2xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#6857df]">Acesso sob sua escolha</p>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight tracking-[-0.04em] text-[#1b2433] sm:text-3xl">Seus dados ajudam a analisar. Nada é publicado por você.</h2>
            <p className="mt-4 text-sm leading-7 text-[#747e8d]">A conexão começa somente depois que você entra com Google e aprova as permissões exibidas. O Otimizador Ads consulta métricas para gerar diagnósticos e sugestões; não envia alterações à sua conta.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white bg-white/80 p-4 shadow-sm lg:max-w-[245px]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e9f8f2] text-xl text-[#16845d]">⌑</span>
            <div>
              <p className="text-sm font-extrabold text-[#263142]">Permissão explícita</p>
              <p className="mt-1 text-[11px] leading-4 text-[#778190]">Revogável nas configurações Google</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 sm:pb-20 lg:px-12">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-[#171d31] px-6 py-10 text-center text-white sm:px-10 sm:py-14">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#bcb4ff]">Pronto para entender sua conta?</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-[-0.045em] sm:text-4xl">Transforme métricas em próximos passos claros.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/55">Conecte sua conta Google Ads quando estiver pronto. Você revisa cada achado e decide o que fazer.</p>
          <Link href="/login" className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#7564ef] px-6 text-sm font-bold text-white transition hover:bg-[#8576ff]">
            Acessar com Google <Seta />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#eceef2] px-5 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <Link href="/" className="text-sm font-extrabold tracking-[-0.04em]">otimizador<span className="text-[#6757dc]">ads</span></Link>
          <p className="text-[11px] text-[#8a93a0]">Uma visão mais clara da sua publicidade. Você continua no comando.</p>
          <Link href="/login" className="text-xs font-bold text-[#6554dd] hover:underline">Entrar na plataforma</Link>
        </div>
      </footer>
    </main>
  );
}
