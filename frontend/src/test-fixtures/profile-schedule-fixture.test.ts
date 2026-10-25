import { beforeEach, describe, expect, it, vi } from 'vitest'

const { sql } = vi.hoisted(() => ({ sql: vi.fn<(query: string) => string>() }))
vi.mock('../../e2e/db', () => ({ sql }))
import { grantProfileCapability } from '../../e2e/profile-schedule-fixture'

const actor = { tenantId: 'tenant-fixture', ownerId: 'owner-fixture' }
const base = ['profile.page', 'profile.categories', 'profile.appearance', 'profile.history']
type Owner = { accountId: string; subscriptionId: string | null; planId: string | null; capabilities: string[] }

function database({ plan = 'existing-pro', version = '', owner = null as Owner | null } = {}) {
  const transactions: string[] = []
  sql.mockImplementation(query => {
    if (query.startsWith('SELECT') && query.includes('json_build_object')) return owner ? JSON.stringify(owner) : ''
    if (query.startsWith('SELECT') && query.includes('FROM profile_plans')) return plan
    if (query.startsWith('SELECT') && query.includes('FROM profile_plan_versions')) return version
    if (query.includes('BEGIN;')) {
      if (plan && /INSERT INTO profile_plans/.test(query)) throw new Error('unique tenant/tier: PRO already exists')
      if (owner && /INSERT INTO profile_billing_accounts/.test(query)) throw new Error('unique tenant/owner: account already exists')
      if (owner?.subscriptionId && /INSERT INTO profile_subscriptions/.test(query)) throw new Error('must preserve the existing subscription')
      transactions.push(query)
    }
    return ''
  })
  return transactions
}

beforeEach(() => { sql.mockReset() })

describe('profile capability fixture isolation', () => {
  it('still creates the first plan, version, account and subscription for a fresh fixture', () => {
    const transactions = database({ plan: '' })
    grantProfileCapability(actor, 'profile.analytics')
    expect(transactions[0]).toContain('INSERT INTO profile_plans')
    expect(transactions[0]).toContain('INSERT INTO profile_plan_versions')
    expect(transactions[0]).toContain('INSERT INTO profile_billing_accounts')
    expect(transactions[0]).toContain('INSERT INTO profile_subscriptions')
  })

  it('adds a capability version to the existing tenant PRO plan without inserting a duplicate plan', () => {
    const transactions = database()
    expect(() => grantProfileCapability(actor, 'profile.analytics')).not.toThrow()
    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toContain("'existing-pro'")
    expect(transactions[0]).toContain('INSERT INTO profile_plan_versions')
    expect(transactions[0]).not.toContain('INSERT INTO profile_plans')
  })

  it('reuses a version already containing the exact requested capability set for another owner', () => {
    const transactions = database({ version: 'existing-analytics-version' })
    grantProfileCapability(actor, 'profile.analytics')
    expect(transactions[0]).toContain("'existing-analytics-version'")
    expect(transactions[0]).not.toContain('INSERT INTO profile_plan_versions')
    expect(transactions[0]).toContain('INSERT INTO profile_subscriptions')
    const lookup = sql.mock.calls.map(([query]) => query).find(query => query.startsWith('SELECT') && query.includes('FROM profile_plan_versions'))!
    expect(lookup).toContain('capabilities @>')
    expect(lookup).toContain('capabilities <@')
    expect(lookup).toContain("\"tenantId\"='tenant-fixture'")
    expect(lookup).toContain("\"planId\"='existing-pro'")
    expect(lookup).not.toContain('profile.scheduling')
  })

  it('preserves the owner subscription and analytics while adding scheduling', () => {
    const owner = { accountId: 'owner-account', subscriptionId: 'owner-subscription', planId: 'existing-pro', capabilities: [...base, 'profile.analytics'] }
    const transactions = database({ owner })
    expect(() => grantProfileCapability(actor, 'profile.scheduling')).not.toThrow()
    expect(transactions[0]).toContain('UPDATE profile_subscriptions')
    expect(transactions[0]).toContain("'owner-subscription'")
    expect(transactions[0]).toContain("'profile.analytics'")
    expect(transactions[0]).toContain("'profile.scheduling'")
    expect(transactions[0]).not.toMatch(/DELETE FROM|TRUNCATE/)
  })

  it('allows repeating a grant without recreating the owner account or entitlement', () => {
    const owner = { accountId: 'owner-account', subscriptionId: 'owner-subscription', planId: 'existing-pro', capabilities: [...base, 'profile.analytics'] }
    const transactions = database({ version: 'existing-analytics-version', owner })
    expect(() => grantProfileCapability(actor, 'profile.analytics')).not.toThrow()
    expect(transactions[0]).not.toContain('INSERT INTO profile_billing_accounts')
    expect(transactions[0]).not.toContain('INSERT INTO profile_plan_versions')
    expect(transactions[0]).toContain('ON CONFLICT("subscriptionId",capability)')
  })

  it('uses an existing billing account without a subscription and keeps other owners untouched', () => {
    const owner = { accountId: 'owner-account', subscriptionId: null, planId: null, capabilities: [] }
    const transactions = database({ version: 'existing-analytics-version', owner })
    grantProfileCapability(actor, 'profile.analytics')
    expect(transactions[0]).not.toContain('INSERT INTO profile_billing_accounts')
    expect(transactions[0]).toContain('INSERT INTO profile_subscriptions')
    expect(transactions[0]).toContain("'owner-account'")
    expect(transactions[0]).toContain("'owner-fixture'")
    expect(transactions[0]).not.toMatch(/DELETE FROM|TRUNCATE/)
  })
})
