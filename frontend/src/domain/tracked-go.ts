export function trackedGoPath(linkId: string, arrivalToken?: string, fallbackToken?: string, queryId?: string): string {
  const token = (arrivalToken || fallbackToken || '').trim()
  if (!token) return `/go/${linkId}`
  return `/go/${linkId}?surfaceToken=${encodeURIComponent(token)}${queryId && /^[0-9a-f-]{36}$/i.test(queryId) ? `&queryId=${encodeURIComponent(queryId)}` : ''}`
}
