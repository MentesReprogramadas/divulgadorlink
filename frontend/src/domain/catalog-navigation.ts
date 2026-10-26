import { discoveryQueryRecord } from '@/features/catalog/discovery/discovery-contract'

export function catalogQueryRecord(values: Record<string, string | string[] | undefined>) {
  const result = discoveryQueryRecord(values)
  if (Array.isArray(values.cursor)) values.cursor.forEach(value => result.append('cursor', value))
  else if (values.cursor) result.set('cursor', values.cursor)
  return result
}
