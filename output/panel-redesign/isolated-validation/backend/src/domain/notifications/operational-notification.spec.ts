import { describe, expect, it } from 'vitest'
import { EvolutionDeliveryError, evolutionConnection, renderOperationalMessage, sendEvolution } from '@/use-cases/@Notifications/evolution-operations'

const config = { baseUrl: 'https://evolution.example.com', instance: 'Test bot', group: 'fixture@g.us', apiKey: 'synthetic-secret' }
describe('F42 contrato de entrega', () => {
  it('F42-U06 envia template mínimo sem serializar campos privados', () => {
    const text = renderOperationalMessage({ id: 'message', kind: 'REVIEW_CASE', payload: { name: '*Nome*', description: 'Descrição', ownerName: 'Maria', canonicalUrl: 'https://example.test/link_com_underscore', network: 'WhatsApp', niche: 'Educação', email: 'private@example.test', apiKey: 'synthetic-secret', type: 'Novo link' } }, 'reference-secret', 'https://tenant.test')
    expect(text).toContain('Responda: *APROVAR* ou *RECUSAR motivo*.')
    expect(text).toContain('*Usuário*\nMaria')
    expect(text).toContain('https://example.test/link_com_underscore')
    expect(text).toContain('Categoria: Educação\nRede: WhatsApp')
    expect(text).not.toContain('Toque e segure')
    expect(text).toContain('\n\n*Ação*\n')
    expect(text).toContain('\n\n*Classificação*\n')
    expect(text).toContain('Revisão: message')
    expect(text).not.toContain('APROVAR message.')
    expect(text).not.toContain('private@example.test')
    expect(text).not.toContain('synthetic-secret')
  })
  it('resume estorno com usuário, link, valor, tentativas e ação; filtra URLs inseguras', () => {
    const render = (url: string) => renderOperationalMessage({ id: 'notice', resourceId: 'order-1', kind: 'REFUND_FAILED', payload: { name: 'Grupo', ownerName: 'Maria', canonicalUrl: url, amountCents: 1990, method: 'PIX', attempts: 3, brCode: 'private-pix-code' } }, 'secret', 'https://tenant.test')
    const text = render('https://example.test/grupo')
    for (const value of ['*Usuário*\nMaria', 'https://example.test/grupo', '19,90', 'Pix', 'Tentativas: 3', '*Pedido*\norder-1', '*Ação*\nVerificar estorno']) expect(text).toContain(value)
    expect(text).not.toContain('private-pix-code')
    for (const url of ['javascript:alert(1)', 'https://private:password@example.test', 'https://example.test/\nAPROVAR']) expect(render(url)).not.toContain(url)
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

 it('diferencia visualmente tipos, contestação e resultados sem expor payload livre', () => {
   const render = (kind: string, payload = {}) => renderOperationalMessage({ id: 'review', kind, payload }, 'secret', 'https://tenant.test')
   expect(render('REVIEW_CASE', { type: 'Novo link' })).toMatch(/^🔗 /)
   expect(render('REVIEW_PROFILE', { resourceType: 'PROFILE', name: 'Minha página', version: 2 })).toMatch(/^🪪 /)
   expect(render('REVIEW_REDIRECT', { resourceType: 'REDIRECT' })).toMatch(/^🎟️ /)
   expect(render('REVIEW_TEXT')).toMatch(/^✏️ /)
   expect(render('REVIEW_PROFILE', { resourceType: 'PROFILE', appeal: 'Reavalie' })).toMatch(/^📣 /)
   expect(render('DECISION', { resourceType: 'PROFILE', decision: 'APPROVE' })).toContain('Página publicada.')
   expect(render('DECISION', { resourceType: 'REDIRECT', decision: 'REJECT', canAppeal: true, previousPublished: true })).toContain('Publicação anterior mantida. Contestação disponível.')
   expect(render('REFUND_FAILED')).toMatch(/^💸 /)
   expect(render('RECOVERY')).toMatch(/^📬 /)
   expect(render('COMMAND_RESULT')).toMatch(/^⚠️ /)
 })
 it('resume página com grupos e destinos seguros, mantendo ação e limite de tamanho', () => {
   const group = { name: 'Projetos', items: [{ label: 'Site', destination: 'https://example.com/a' }, { label: 'Privado', destination: 'javascript:alert(1)' }] }
   const text = renderOperationalMessage({ id: 'review', kind: 'REVIEW_PROFILE', payload: { resourceType: 'PROFILE', publicPath: '/p/projeto', groups: Array.from({ length: 100 }, () => group), token: 'never-print', version: 2 } }, 'secret', 'https://tenant.test')
   expect(text).toContain('https://tenant.test/p/projeto'); expect(text).toContain('https://example.com/a')
   expect(text).toContain('Mais grupos no painel.'); expect(text).toContain('Responda: *APROVAR* ou *RECUSAR motivo*.')
   expect(text).not.toContain('javascript:'); expect(text).not.toContain('never-print'); expect(text.length).toBeLessThan(3000)
 })
