import { describe, expect, it } from 'vitest'
import { EvolutionDeliveryError, evolutionConnection, renderOperationalMessage, sendEvolution } from '@/use-cases/@Notifications/evolution-operations'

const config = { baseUrl: 'https://evolution.example.com', instance: 'Test bot', group: 'fixture@g.us', apiKey: 'synthetic-secret' }
describe('F42 contrato de entrega', () => {
  it('F42-U06 envia template mínimo sem serializar campos privados', () => {
    const text = renderOperationalMessage({ id: 'message', kind: 'REVIEW_CASE', payload: { name: '*Nome*', description: 'Descrição', email: 'private@example.test', apiKey: 'synthetic-secret', type: 'Novo link' } }, 'reference-secret', 'https://tenant.test')
    expect(text).toContain('\nAPROVAR\n')
    expect(text).toContain('RECUSAR motivo da recusa')
    expect(text).toContain('Revisão: message')
    expect(text).not.toContain('APROVAR message.')
    expect(text).not.toContain('private@example.test')
    expect(text).not.toContain('synthetic-secret')
  })
  it('explica decisões e falhas sem códigos internos e distingue edição recusada', () => {
    const render = (kind: string, payload: Record<string, string>) => renderOperationalMessage({ id: 'decision', kind, payload }, 'secret', 'https://tenant.test')
    expect(render('DECISION', { name: 'Edição A', status: 'PUBLISHED', decision: 'REJECT', reviewMessageId: 'review-a' })).toContain('continua publicado com o texto anterior')
    const stale = render('COMMAND_RESULT', { resultCode: 'review_already_resolved', name: 'Link A', reviewMessageId: 'review-a' })
    expect(stale).toContain('A decisão anterior foi mantida')
    expect(stale).toContain('Revisão: review-a')
    expect(stale).not.toContain('review_already_resolved')
  })
  it('F42-U07 classifica 500, 401, timeout e aceite sem ID distintamente', async () => {
    for (const [status, disposition] of [[500, 'RETRY'], [429, 'RETRY'], [401, 'DEAD']] as const) {
      await expect(sendEvolution(config, 'test', async () => new Response('{}', { status }))).rejects.toMatchObject({ disposition })
    }
    await expect(sendEvolution(config, 'test', async () => { throw new Error('do not leak credentials') })).rejects.toEqual(new EvolutionDeliveryError('UNCERTAIN', 'delivery_unconfirmed'))
    await expect(sendEvolution(config, 'test', async () => new Response('{}'))).rejects.toMatchObject({ disposition: 'UNCERTAIN' })
  })
  it('usa origem configurada, instância codificada e impede redirecionamento', async () => {
    let request: { url: string; init?: RequestInit } | null = null
    const id = await sendEvolution(config, 'test', async (url, init) => {
      request = { url: String(url), init }
      return new Response('{"key":{"id":"accepted"}}')
    })
    expect(id).toBe('accepted')
    expect(request).toMatchObject({ url: 'https://evolution.example.com/message/sendText/Test%20bot', init: { redirect: 'error' } })
  })
  it('consulta conexão sem presumir conectado diante de erro ou corpo inesperado', async () => {
    expect(await evolutionConnection(config, async () => new Response('{"instance":{"state":"open"}}'))).toBe('open')
    expect(await evolutionConnection(config, async () => new Response('{"instance":{"state":"close"}}'))).toBe('close')
    expect(await evolutionConnection(config, async () => new Response('{}', { status: 503 }))).toBe('unknown')
    expect(await evolutionConnection(config, async () => { throw new Error('network') })).toBe('unknown')
  })
})
