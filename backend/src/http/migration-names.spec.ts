import { describe, expect, it } from 'vitest'
import { migrationNamesOnDisk } from '@/http/migration-names'

describe('migrations no disco', () => {
  it('inclui o resumo de nicho e rede', () => {
    expect(migrationNamesOnDisk()).toContain('20261006120000_facet_summary')
  })
})