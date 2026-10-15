export function banReasonOf(after: unknown): string | null {
  if (!after || typeof after !== 'object' || Array.isArray(after)) return null
  const reason = (after as { reason?: unknown }).reason
  if (typeof reason !== 'string') return null
  const trimmed = reason.trim()
  if (!trimmed) return null
  return trimmed.slice(0, 500)
}
