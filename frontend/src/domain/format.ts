export function formatWhen(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date).replace(',', ' às')
}

export function formatCount(value: number, singular: string, plural: string): string {
  const amount = Number.isFinite(value) ? value : 0
  const text = amount.toLocaleString('pt-BR')
  return `${text} ${amount === 1 ? singular : plural}`
}

export function formatRate(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const rounded = Math.round(value * 10) / 10
  const text = rounded.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
    maximumFractionDigits: 1,
  })
  return `${text}%`
}
