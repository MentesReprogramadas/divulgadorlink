import { describe, expect, it } from 'vitest'
import { pathTemplate, utmToken } from '@/domain/analytics/site-traffic'

describe('tráfego do site', () => {
  it('agrupa rotas dinâmicas para não explodir linhas por id', () => {
    expect(pathTemplate('/')).toBe('/')
    expect(pathTemplate('/divulgar')).toBe('/divulgar')
    expect(pathTemplate('/link/abc123')).toBe('/link/:id')
    expect(pathTemplate('/rede/telegram')).toBe('/rede/:slug')
    expect(pathTemplate('/nicho/jogos/')).toBe('/nicho/:slug')
    expect(pathTemplate('/painel/links/novo')).toBe('/painel/links/novo')
    expect(pathTemplate('/painel/links/ck123/editar')).toBe('/painel/links/:id/editar')
  })

  it('não conta admin e manda o desconhecido para outros', () => {
    expect(pathTemplate('/admin/visao')).toBeNull()
    expect(pathTemplate('/qualquer/coisa')).toBe('/outros')
    expect(pathTemplate('não é caminho')).toBe('/outros')
  })

  it('aceita só UTM do alfabeto seguro', () => {
    expect(utmToken('meta_ads-2026')).toBe('meta_ads-2026')
    expect(utmToken('<script>')).toBe('')
    expect(utmToken(undefined)).toBe('')
    expect(utmToken('a'.repeat(81))).toBe('')
  })
})
