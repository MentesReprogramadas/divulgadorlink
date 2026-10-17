export function formatCents(cents: number): string {
  const value = (cents / 100).toFixed(2).replace('.', ',')
  return `R$ ${value}`
}
