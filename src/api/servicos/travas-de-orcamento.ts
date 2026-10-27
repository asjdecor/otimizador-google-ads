export interface VerificacaoDeOrcamento {
  ok: boolean;
  mensagem: string | null;
  maximoPermitido: number | null;
}

/**
 * Valida o orçamento diário proposto para uma campanha nova.
 * Recebe centavos inteiros para a operação do Google Ads.
 */
export function verificarOrcamento({
  valorDiario,
  tetoPorCampanha,
  tetoTotal,
  somaAtivas,
}: {
  valorDiario: number;
  tetoPorCampanha: number | null;
  tetoTotal: number | null;
  somaAtivas: number;
}): VerificacaoDeOrcamento {
  if (!Number.isInteger(valorDiario) || valorDiario <= 0) {
    return { ok: false, mensagem: "Informe um orçamento diário inteiro maior que zero.", maximoPermitido: null };
  }

  if (tetoPorCampanha !== null) {
    if (valorDiario > tetoPorCampanha) {
      return {
        ok: false,
        mensagem: `O orçamento diário de R$ ${(valorDiario / 100).toFixed(2)} ultrapassa o teto por campanha de R$ ${(tetoPorCampanha / 100).toFixed(2)}.`,
        maximoPermitido: tetoPorCampanha,
      };
    }
  }

  if (tetoTotal !== null) {
    if (somaAtivas + valorDiario > tetoTotal) {
      return {
        ok: false,
        mensagem: `A soma atual de campanhas ativas (R$ ${(somaAtivas / 100).toFixed(2)}) mais o novo orçamento diário (R$ ${(valorDiario / 100).toFixed(2)}) ultrapassa o teto total de R$ ${(tetoTotal / 100).toFixed(2)}.`,
        maximoPermitido: tetoTotal - somaAtivas,
      };
    }
  }

  return { ok: true, mensagem: null, maximoPermitido: null };
}
