export const CONFIG_KEYS = [
  'MODERATION_AUTO_APPROVE_THRESHOLD',
  'SEARCH_RELEVANCE_THRESHOLD',
  'SEARCH_TEXT_WEIGHT',
  'SEARCH_SEMANTIC_WEIGHT',
] as const

export type ConfigKey = (typeof CONFIG_KEYS)[number]

export function readConfig(rows: Partial<Record<ConfigKey, string>>, key: ConfigKey): number {
  const raw = rows[key]
  if (raw === undefined) throw new Error('config ausente')
  const value = Number(raw)
  if (!Number.isFinite(value)) throw new Error('config inválida')
  return value
}
