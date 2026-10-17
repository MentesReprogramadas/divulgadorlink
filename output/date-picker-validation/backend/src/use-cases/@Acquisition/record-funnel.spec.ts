import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  getAcquisitionStore,
  metaPayload,
  notifyMeta,
  publishEventName,
  resetAcquisitionStoreForTest,
  type MetaContext,
} from '@/use-cases/@Acquisition/record-funnel'
import { parseTouch } from '@/domain/acquisition/touch'

const touch = parseTouch(JSON.stringify({
  source: 'meta', medium: 'paid', campaign: 'outubro', content: 'a', term: 'b', landingPath: '/divulgar',
}))

describe('funil', () => {
  it('publica só na primeira transição para publicado', () => {
    expect(publishEventName('PENDING_MODERATION', 'PUBLISHED')).toBe('LinkPublished')
    expect(publishEventName('PUBLISHED', 'PUBLISHED')).toBeNull()
    expect(publishEventName('PENDING_MODERATION', 'PRE_REJECTED')).toBeNull()
  })

  it('grava o toque só quando o cookie existe e não repete o evento', async () => {
    resetAcquisitionStoreForTest()
    const store = getAcquisitionStore()
    await store.rememberRegistration({ tenantId: 't', userId: 'u1', touch })
    await store.rememberRegistration({ tenantId: 't', userId: 'u2', touch: null })
    expect(store.touchFor('u1')?.campaign).toBe('outubro')
    expect(store.touchFor('u2')).toBeNull()
    const again = await store.recordFunnel({
      tenantId: 't', eventId: 'u1', name: 'CompleteRegistration', userId: 'u1', linkId: null,
    })
    expect(again).toBe('duplicate')
  })

  it('não chama a Meta no evento repetido', async () => {
    resetAcquisitionStoreForTest()
    const store = getAcquisitionStore()
    const calls: string[] = []
    const input = {
      tenantId: 't',
      eventId: 'link-1',
      name: 'SubmitLink' as const,
      userId: 'u1',
      linkId: 'link-1',
      onInserted: async () => { calls.push('meta') },
    }
    expect(await store.recordFunnel(input)).toBe('inserted')
    expect(await store.recordFunnel(input)).toBe('duplicate')
    expect(calls).toEqual(['meta'])
  })
})

const sha = (value: string) => createHash('sha256').update(value).digest('hex')

const meta: MetaContext = {
  consent: 'marketing',
  userAgent: 'Mozilla/5.0',
  fbp: 'fb.1.1700000000000.123',
  fbc: '',
  sourceUrl: 'https://temlinkaqui.com/cadastro',
}

describe('API de conversões', () => {
  it('monta event_time, origem e dados do navegador sem e-mail', () => {
    const payload = metaPayload({ name: 'CompleteRegistration', eventId: 'u1', meta, now: new Date('2026-10-10T12:00:00Z') })
    expect(payload).toEqual({
      event_name: 'CompleteRegistration',
      event_id: 'u1',
      event_time: 1791633600,
      action_source: 'website',
      event_source_url: 'https://temlinkaqui.com/cadastro',
      user_data: { client_user_agent: 'Mozilla/5.0', fbp: 'fb.1.1700000000000.123' },
    })
  })

  it('manda id e e-mail só em hash e o valor da compra em custom_data', () => {
    const payload = metaPayload({
      name: 'Purchase',
      eventId: 'o1:purchase',
      meta: { ...meta, externalId: 'u1', email: ' Ana@Example.com ' },
      custom: { value: 19.9, currency: 'BRL', content_ids: ['HOME'], order_id: 'o1' },
    })
    expect(payload?.user_data).toEqual({
      client_user_agent: 'Mozilla/5.0',
      fbp: 'fb.1.1700000000000.123',
      external_id: [sha('u1')],
      em: [sha('ana@example.com')],
    })
    expect(JSON.stringify(payload)).not.toContain('Ana@Example.com')
    expect(payload?.custom_data).toEqual({ value: 19.9, currency: 'BRL', content_ids: ['HOME'], order_id: 'o1' })
  })

  it('não monta nada sem aceite ou sem navegador', () => {
    expect(metaPayload({ name: 'SubmitLink', eventId: 'l1', meta: { ...meta, consent: 'denied' } })).toBeNull()
    expect(metaPayload({ name: 'SubmitLink', eventId: 'l1', meta: { ...meta, consent: undefined } })).toBeNull()
    expect(metaPayload({ name: 'SubmitLink', eventId: 'l1', meta: { ...meta, userAgent: '' } })).toBeNull()
    expect(metaPayload({ name: 'SubmitLink', eventId: 'l1', meta: null })).toBeNull()
  })

  it('não chama a Meta quando a pessoa recusou', async () => {
    const calls: string[] = []
    const result = await notifyMeta({
      name: 'SubmitLink',
      eventId: 'l1',
      meta: { ...meta, consent: 'denied' },
      token: 'tok',
      pixelId: 'px',
      fetchImpl: (async () => { calls.push('x'); return new Response('{}') }) as typeof fetch,
    })
    expect(result).toBe('skipped')
    expect(calls).toEqual([])
  })

  it('devolve a recusa da Meta em vez de engolir', async () => {
    const result = await notifyMeta({
      name: 'SubmitLink',
      eventId: 'l1',
      meta,
      token: 'tok',
      pixelId: 'px',
      fetchImpl: (async () => new Response('{"error":{"message":"bad"}}', { status: 400 })) as typeof fetch,
    })
    expect(result).toBe('rejected')
  })
})
