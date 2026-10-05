import { describe, expect, it } from 'vitest'
import {
  hyperdxServiceName,
  isActuatorProbe,
  redisStatement,
  shouldRegisterHyperDX,
} from '@/observability/hyperdx-config'

describe('hyperdx', () => {
  it('não sobe o SDK em teste nem sem chave', () => {
    expect(shouldRegisterHyperDX({ NODE_ENV: 'test', HDX_API_KEY: 'chave' })).toBe(false)
    expect(shouldRegisterHyperDX({ NODE_ENV: 'production', HDX_API_KEY: '  ' })).toBe(false)
    expect(shouldRegisterHyperDX({ NODE_ENV: 'production', HDX_API_KEY: 'chave' })).toBe(true)
  })

  it('separa o worker do serviço da API', () => {
    expect(hyperdxServiceName(['node', 'C:/app/src/server.ts'])).toBe('divulgador-links-api')
    expect(hyperdxServiceName(['node', 'C:/app/src/worker.ts'])).toBe('divulgador-links-worker')
    expect(hyperdxServiceName(['node', 'C:/app/build/worker.js'], 'catalogo')).toBe('catalogo-worker')
    expect(hyperdxServiceName(['node', 'C:/app/src/server.ts'], 'catalogo')).toBe('catalogo')
    expect(hyperdxServiceName(['node', 'C:/app/src/worker.ts'], 'catalogo-worker')).toBe('catalogo-worker')
  })

  it('ignora probe de health e não manda o segredo da chave do Redis', () => {
    expect(isActuatorProbe('/api/v1/actuator/ready?x=1')).toBe(true)
    expect(isActuatorProbe('/api/v1/links')).toBe(false)
    expect(redisStatement('GET', ['pwdreset:token:hash-secreto'])).toBe('GET pwdreset:token')
    expect(redisStatement('SET', ['refresh:revoked:jti-secreto', '1'])).toBe('SET refresh:revoked')
    expect(redisStatement('GET', ['sem-prefixo'])).toBe('GET')
  })
})
