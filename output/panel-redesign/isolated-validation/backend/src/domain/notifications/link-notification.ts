export function linkNotificationSnapshot(link: {
  name: string; description: string; canonicalUrl: string; otherNote?: string | null;
  owner: { name: string | null } | null; network: { name: string }; niche: { name: string };
}) {
  return { name: link.name, description: link.description, canonicalUrl: link.canonicalUrl, ownerName: link.owner?.name ?? 'Não informado', network: link.network.name, niche: link.niche.name, note: link.otherNote ?? null }
}

export function notificationUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048 || /\s/.test(value)) return null
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch { return null }
}
