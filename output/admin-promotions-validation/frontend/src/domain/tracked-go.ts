export function trackedGoPath(linkId: string, arrivalToken?: string, fallbackToken?: string): string {
  const token = (arrivalToken || fallbackToken || '').trim()
  if (!token) return `/go/${linkId}`
  return `/go/${linkId}?surfaceToken=${encodeURIComponent(token)}`
}
