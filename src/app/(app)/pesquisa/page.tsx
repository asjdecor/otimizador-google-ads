import { iaConfiguradaNoAmbiente } from "@/api/integracoes/fabrica";
import { carregarContextoDaConta } from "@/api/http/contexto-da-conta";
import { traduzirErroGoogleAds } from "@/api/integracoes/google-ads/erros";
import type { PontoDePartida } from "@/api/servicos/esquema-pesquisa-de-mercado";
import { lerUltimaPesquisa, montarPontoDePartida } from "@/api/servicos/pesquisa-de-mercado";
import { Aviso } from "@/componentes/Aviso";
import { AvisoSemConta } from "@/componentes/AvisoSemConta";
import { PainelDePesquisa } from "@/componentes/PainelDePesquisa";

export const dynamic = "force-dynamic";

export default async function PaginaPesquisa() {
  const contexto = await carregarContextoDaConta();
  if (contexto.tipo === "desconectado" || contexto.tipo === "sem-conta") {
    return <AvisoSemConta titulo="Pesquisa" motivo={contexto.tipo} />;
  }

  let pontoDePartida: PontoDePartida | null = null;
  let erro = contexto.tipo === "erro" ? contexto.mensagem : null;
  if (contexto.tipo === "pronto") {
    try {
      pontoDePartida = await montarPontoDePartida(contexto);
    } catch (falha) {
      erro = traduzirErroGoogleAds(falha);
    }
  }
  const pesquisa = await lerUltimaPesquisa(contexto.conta.customerId);

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1>Pesquisa</h1>
        <p className="text-texto-suave">
          Descubra quem são seus concorrentes, o que prometem ao público e quais palavras-chave vale testar. Nada é
          alterado no Google Ads: exporte o CSV e importe no Google Ads Editor.
        </p>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <PainelDePesquisa
        pesquisaInicial={pesquisa}
        pontoDePartida={pontoDePartida}
        iaConfigurada={iaConfiguradaNoAmbiente()}
        moeda={contexto.conta.moeda || "BRL"}
      />
    </section>
  );
}
