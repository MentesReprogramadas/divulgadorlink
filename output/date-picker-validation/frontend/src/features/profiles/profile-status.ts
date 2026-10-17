export function profileStatus(dirty: boolean, publishedVersion: number | null, draftVersion: number): { label: string; tone: 'wait' | 'ok' | 'warn' } {
  if (dirty) return { label: 'Alterações não salvas', tone: 'warn' }
  if (publishedVersion === null) return { label: 'Rascunho', tone: 'wait' }
  return publishedVersion === draftVersion ? { label: 'Publicado', tone: 'ok' } : { label: 'Alterações em rascunho', tone: 'wait' }
}
