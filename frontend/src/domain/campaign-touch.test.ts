import { describe, expect, it } from 'vitest'
import { campaignTouch, campaignTouchFromUrl, campaignRegistrationHref, touchDecision } from './campaign-touch'

const input = { pathname: '/divulgar', source: 'ig', medium: 'paid', campaign: '120257166892340011', content: '', term: '' }

describe('atribuição de campanha', () => {
  it.each(['Video Instagram', 'público', '{{ad.name}}', 'a'.repeat(81), 'contato@example.com'])('descarta rótulo opcional inválido sem apagar campanha: %s', value => {
    expect(campaignTouch({ ...input, content: value, term: value })).toEqual({
      source: input.source, medium: input.medium, campaign: input.campaign, content: '', term: '', landingPath: '/divulgar',
    })
  })

  it('mantém validação dos campos obrigatórios, destino e primeiro toque', () => {
    expect(campaignTouch({ ...input, source: 'meta ads' })).toBeNull()
    expect(campaignTouch({ ...input, pathname: '/rede/whatsapp' })).toBeNull()
    expect(touchDecision({ ...input, consent: undefined, existing: false })).toEqual({ action: 'keep' })
    expect(touchDecision({ ...input, consent: 'marketing', existing: true })).toEqual({ action: 'keep' })
    expect(touchDecision({ ...input, consent: 'denied', existing: true })).toEqual({ action: 'clear' })
  })

  it('leva somente o contexto válido ao cadastro, sem persistência nem texto livre', () => {
    const params = new URLSearchParams({ utm_source: 'ig', utm_medium: 'paid', utm_campaign: input.campaign, utm_content: 'Video Instagram', email: 'pessoa@example.com', fbclid: 'nao-copiar' })
    const href = campaignRegistrationHref('/cadastro', params)
    const url = new URL(href, 'https://site.test')
    expect(url.searchParams.get('tla_landing')).toBe('/divulgar')
    expect(url.searchParams.has('utm_content')).toBe(false)
    expect(href).not.toMatch(/email|fbclid|example/)
    expect(campaignTouchFromUrl(url)).toEqual(campaignTouch(input))
    expect(campaignRegistrationHref('/painel/links/novo', params)).toBe('/painel/links/novo')
    expect(campaignRegistrationHref('/cadastro', new URLSearchParams())).toBe('/cadastro')
    url.searchParams.delete('tla_landing')
    expect(campaignTouchFromUrl(url)).toBeNull()
  })
})
