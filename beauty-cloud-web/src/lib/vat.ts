export type VatSettings = {
  enabled?: boolean;
  prices_include_vat?: boolean;
  vat_percent?: number;
};

export function splitVatAmount(
  amount: number,
  vatPercent = 15,
  pricesIncludeVat = true,
) {
  if (!amount || vatPercent <= 0) {
    return { netAmount: amount, vatAmount: 0, totalAmount: amount };
  }

  if (pricesIncludeVat) {
    const netAmount = Math.round((amount / (1 + vatPercent / 100)) * 100) / 100;
    const vatAmount = Math.round((amount - netAmount) * 100) / 100;
    return { netAmount, vatAmount, totalAmount: amount };
  }

  const vatAmount = Math.round(amount * (vatPercent / 100) * 100) / 100;
  return {
    netAmount: amount,
    vatAmount,
    totalAmount: Math.round((amount + vatAmount) * 100) / 100,
  };
}
