import { describe, expect, it } from 'vitest'
import { parsePixExpiration, PIX_EXPIRES_IN_SECONDS, PixExpirationConfigError, pixExpiresInSeconds } from './pix-expiration'

describe('expiração do Pix', () => {
  it('sem variável usa 1800 segundos em qualquer ambiente', () => {
    expect(PIX_EXPIRES_IN_SECONDS).toBe(1800)
    for (const nodeEnv of ['production', 'dev', 'test', undefined]) {
      expect(parsePixExpiration(undefined, nodeEnv)).toBe(1800)
      expect(parsePixExpiration('', nodeEnv)).toBe(1800)
    }
  })

  it('produção recusa qualquer valor, inclusive o próprio padrão', () => {
    for (const raw of ['3', '1800', '60']) {
      expect(() => parsePixExpiration(raw, 'production')).toThrow(PixExpirationConfigError)
    }
  })

  it('fora de produção aceita só inteiro entre 3 e 1800', () => {
    expect(parsePixExpiration('3', 'test')).toBe(3)
    expect(parsePixExpiration('1800', 'dev')).toBe(1800)
    for (const raw of ['2', '0', '1801', '99999', '-5', '3.5', '1e3', 'abc', ' 5']) {
      expect(() => parsePixExpiration(raw, 'dev')).toThrow(PixExpirationConfigError)
    }
  })

  it('lê o ambiente a cada chamada', () => {
    expect(pixExpiresInSeconds({ NODE_ENV: 'test', PIX_EXPIRATION_SECONDS: '4' })).toBe(4)
    expect(pixExpiresInSeconds({ NODE_ENV: 'test' })).toBe(1800)
  })
})
