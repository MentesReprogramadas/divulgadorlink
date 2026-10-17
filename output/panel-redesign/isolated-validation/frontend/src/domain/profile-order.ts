/** Used by both group and link controls; a move swaps positions without changing membership. */
export function moveProfileItem<T extends { id: string }>(items: readonly T[], from: number, to: number): T[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= items.length || to >= items.length || new Set(items.map(i => i.id)).size !== items.length) throw new Error('Ordem inválida.')
  const result = [...items]; [result[from], result[to]] = [result[to], result[from]]
  return result
}
