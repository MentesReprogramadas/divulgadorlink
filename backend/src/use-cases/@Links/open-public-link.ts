export function openPublicLink(link: { status: string }): { visible: boolean; redirect: boolean } {
  if (link.status !== 'PUBLISHED') return { visible: false, redirect: false }
  return { visible: true, redirect: false }
}
