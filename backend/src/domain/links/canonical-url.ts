export function canonicalUrl(raw: string): string {
  const url = new URL(raw)
  url.protocol = 'https:'
  url.hostname = url.hostname.toLowerCase()
  url.hash = ''
  const kept = new URLSearchParams()
  url.searchParams.forEach((value, key) => {
    if (!key.startsWith('utm_') && key !== 'fbclid') kept.append(key, value)
  })
  url.search = kept.toString() ? `?${kept.toString()}` : ''
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1)
  }
  return url.toString()
}
