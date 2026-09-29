export function editLinkText(input: {
  publishedName: string
  nextName: string
  blocklisted: boolean
  ai: 'PUBLISH' | 'ADMIN'
}): { visibleName: string; ranAi: boolean } {
  if (input.blocklisted) return { visibleName: input.publishedName, ranAi: false }
  if (input.ai === 'PUBLISH') return { visibleName: input.nextName, ranAi: true }
  return { visibleName: input.publishedName, ranAi: true }
}
