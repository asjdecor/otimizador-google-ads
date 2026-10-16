import { lerConfiguracaoGoogle } from "@/api/configuracao/ambiente";
import { ErroParaUsuario } from "@/api/erro-para-usuario";
import { criarApiGoogleAds, type ApiGoogleAds, type CredenciaisDeConsulta } from "@/api/integracoes/google-ads/api-google-ads";
import { traduzirErroGoogleAds } from "@/api/integracoes/google-ads/erros";
import { lerConfiguracaoDoApp, type ConfiguracaoDoApp } from "@/api/servicos/configuracao";
import { lerRefreshTokenSalvo, obterEstadoDaConexao, type ContaSalva } from "@/api/servicos/conexao";
import type { Periodo } from "@/api/servicos/periodo";
import { lerPeriodoDaRequisicao } from "./periodo-da-requisicao";

export type ContextoDaConta =
  | { tipo: "desconectado" }
  | { tipo: "sem-conta" }
  | { tipo: "erro"; mensagem: string; conta: ContaSalva; periodo: Periodo; configuracao: ConfiguracaoDoApp }
  | {
      tipo: "pronto";
      conta: ContaSalva;
      periodo: Periodo;
      configuracao: ConfiguracaoDoApp;
      api: ApiGoogleAds;
      credenciais: CredenciaisDeConsulta;
    };

/** Tudo o que uma tela de dados precisa: conta escolhida, período, configuração e acesso à API. */
export async function carregarContextoDaConta(): Promise<ContextoDaConta> {
  const estado = await obterEstadoDaConexao();
  if (!estado.conectado) return { tipo: "desconectado" };
  const conta = estado.contaSelecionada;
  if (!conta) return { tipo: "sem-conta" };

  const configuracao = await lerConfiguracaoDoApp();
  const periodo = await lerPeriodoDaRequisicao(configuracao.periodoPadrao);
  try {
    const refreshToken = await lerRefreshTokenSalvo();
    if (!refreshToken) throw new ErroParaUsuario("O acesso ao Google não foi encontrado. Conecte a conta de novo.");
    return {
      tipo: "pronto",
      conta,
      periodo,
      configuracao,
      api: criarApiGoogleAds(lerConfiguracaoGoogle()),
      credenciais: { customerId: conta.customerId, loginCustomerId: conta.loginCustomerId, refreshToken },
    };
  } catch (erro) {
    return { tipo: "erro", mensagem: traduzirErroGoogleAds(erro), conta, periodo, configuracao };
  }
}
