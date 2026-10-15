export function openPublicLink(link: {
  status: string
  ownerStatus?: 'ACTIVE' | 'BANNED' | null
}): { visible: boolean; redirect: boolean } {
  if (link.status !== 'PUBLISHED' || link.ownerStatus === 'BANNED') {
    return { visible: false, redirect: false }
  }
  return { visible: true, redirect: false }
}
