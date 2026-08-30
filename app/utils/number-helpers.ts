/** Formatea un número como moneda colombiana (COP). */
export const formatCOP = (value?: number | null): string => {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) return '$0'
  return `$${amount.toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
