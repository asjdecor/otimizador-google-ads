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

/** "2026-10-15T14:05:00Z" → "15/10/2026 11:05" (fuso do computador). */
export function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);
}

/** Custo de uma geração de IA: "≈ US$ 0,03"; abaixo de 1 centavo vira "< US$ 0,01". */
export function formatarCustoDaIa(dolares: number | null): string {
  if (dolares === null || !Number.isFinite(dolares)) return "custo não estimado";
  if (dolares < 0.01) return "< US$ 0,01";
  return `≈ ${formatarMoeda(dolares, "USD")}`;
}
