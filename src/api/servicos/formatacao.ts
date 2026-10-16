/** "1234567890" → "123-456-7890" (formato que o Google Ads mostra). */
export function formatarIdDaConta(customerId: string): string {
  const digitos = customerId.replace(/\D/g, "");
  if (digitos.length !== 10) return customerId;
  return `${digitos.slice(0, 3)}-${digitos.slice(3, 6)}-${digitos.slice(6)}`;
}

const SEM_VALOR = "—";

/** R$ 1.234,56 (usa a moeda da conta; sem moeda, assume BRL). */
export function formatarMoeda(valor: number | null, moeda = "BRL"): string {
  if (valor === null || !Number.isFinite(valor)) return SEM_VALOR;
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda || "BRL" }).format(valor);
  } catch {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
  }
}

/** 0.0345 → "3,45%". */
export function formatarPercentual(fracao: number | null): string {
  if (fracao === null || !Number.isFinite(fracao)) return SEM_VALOR;
  return new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    fracao,
  );
}

/** 12345 → "12.345"; conversões fracionadas ficam com até 2 casas. */
export function formatarNumero(valor: number | null): string {
  if (valor === null || !Number.isFinite(valor)) return SEM_VALOR;
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(valor);
}

/** "2026-10-14" → "14/10/2026". */
export function formatarData(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : dataIso;
}
