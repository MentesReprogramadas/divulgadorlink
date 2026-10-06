export function homeStructuredData(
  website: Record<string, string>,
  origin: string,
  ids: string[],
) {
  const site = { ...website }
  delete site['@context']
  const graph: Array<Record<string, unknown>> = [site]
  if (ids.length > 0) {
    graph.push({
      '@type': 'ItemList',
      itemListElement: ids.map((id, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${origin}/link/${id}`,
      })),
    })
  }
  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}
