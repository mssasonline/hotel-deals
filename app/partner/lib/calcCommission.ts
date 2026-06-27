export function calcCommission(b: {
  subtotal: number | null;
  total_price: number;
  breakfast_included?: boolean | null;
  breakfast_price_per_person?: number | null;
  guests_count?: number | null;
  check_in: string;
  check_out: string;
}): { adminAmount: number; partnerAmount: number } {
  const nights    = Math.max(1, Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86_400_000));
  const subtotal  = b.subtotal ?? 0;
  const sc        = Math.round(subtotal * 0.10 * 100) / 100;
  const breakfast = (b.breakfast_included && (b.breakfast_price_per_person ?? 0) > 0)
    ? Math.round((b.breakfast_price_per_person ?? 0) * (b.guests_count ?? 1) * nights * 100) / 100
    : 0;
  const base         = subtotal + sc + breakfast;
  const adminAmount  = Math.round(base * 0.10 * 100) / 100;
  const partnerAmount = Math.round((b.total_price - adminAmount) * 100) / 100;
  return { adminAmount, partnerAmount };
}
