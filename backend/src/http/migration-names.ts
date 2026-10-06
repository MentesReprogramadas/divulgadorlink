import { readdirSync } from 'node:fs'
import path from 'node:path'

export function migrationNamesOnDisk(): string[] {
  return readdirSync(path.join(__dirname, '../../prisma/migrations'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}
