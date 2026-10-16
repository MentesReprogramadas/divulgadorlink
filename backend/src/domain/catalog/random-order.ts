import { createHash, randomBytes } from 'node:crypto'

export function newOrderSeed(): string {
  return randomBytes(16).toString('hex')
}

// The same key is computed by PostgreSQL for cursor pagination.
export function orderKey(seed: string, id: string): string {
  return createHash('md5').update(seed + id).digest('hex')
}

export function randomOrder<T extends { id: string }>(rows: T[], seed: string): T[] {
  return rows.map((row) => ({ row, key: orderKey(seed, row.id) }))
    .sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : a.row.id < b.row.id ? -1 : a.row.id > b.row.id ? 1 : 0)
    .map(({ row }) => row)
}
