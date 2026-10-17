import type { ProfileContent } from './profile-contract'

/** Insert at the chosen position; the relative order of the other records is preserved. */
export function reorderProfileItems<T extends { id: string }>(items: readonly T[], source: string, target: string): T[] {
  const from = items.findIndex(item => item.id === source), to = items.findIndex(item => item.id === target)
  if (from < 0 || to < 0 || from === to) return [...items]
  const next = [...items], [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function transferProfileLink(content: ProfileContent, itemId: string, categoryId: string): ProfileContent {
  const item = content.items.find(item => item.id === itemId)
  if (!item || item.categoryId === categoryId || !content.categories.some(group => group.id === categoryId)) return content
  return { ...content, items: [...content.items.filter(row => row.id !== itemId), { ...item, categoryId }] }
}
