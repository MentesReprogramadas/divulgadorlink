export function urlAvailability(status: number | null): 'alive' | 'dead' {
  if (status === null) return 'dead'
  if (status >= 200 && status < 400) return 'alive'
  if (status === 401 || status === 403 || status === 405 || status === 429) return 'alive'
  return 'dead'
}
