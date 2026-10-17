export function hostMatchesNetwork(hostname: string, knownHosts: string[]): boolean {
  if (knownHosts.length === 0) return true
  const host = hostname.toLowerCase().split(':')[0] ?? ''
  return knownHosts.some((item) => {
    const known = item.toLowerCase()
    return host === known || host.endsWith(`.${known}`)
  })
}
