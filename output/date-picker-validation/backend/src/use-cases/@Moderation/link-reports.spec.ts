import { describe, expect, it } from 'vitest'
import { submitLinkReport, type LinkReportsRepository, type ReportReceipt } from './link-reports'

describe('F06 intake', () => {
  it('F06-U03/T02 cem denúncias não alteram publicação nem revelam comentário no protocolo', async () => {
    const link = { id: 'public-link', status: 'PUBLISHED' }, reports: ReportReceipt[] = []
    const repository: LinkReportsRepository = {
      async submit(input) {
        const row: ReportReceipt = { id: 'report-' + reports.length, status: 'RECEIVED', createdAt: input.now }
        reports.push(row)
        return row
      },
      async list() { throw new Error('not used') },
      async decide() { throw new Error('not used') },
    }
    for (let i = 0; i < 100; i++) {
      const receipt = await submitLinkReport({ tenantId: 'tenant', actorId: 'actor-' + i, linkId: link.id, reason: 'SPAM', comment: 'private-comment' }, repository)
      expect(Object.keys(receipt).sort()).toEqual(['createdAt', 'id', 'status'])
    }
    expect(reports).toHaveLength(100)
    expect(link.status).toBe('PUBLISHED')
  })
  it('recusa comentário excessivo antes de persistir', async () => {
    const unused = async (): Promise<never> => { throw new Error('must not persist') }
    await expect(submitLinkReport({ tenantId: 'tenant', actorId: 'actor', linkId: 'link', reason: 'SPAM', comment: 'x'.repeat(501) }, { submit: unused, list: unused, decide: unused })).rejects.toThrow('Revise')
  })
})
