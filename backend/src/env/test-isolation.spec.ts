import { expect,it } from 'vitest'
import '@prisma/client'
import { env } from './index'

it('não carrega credenciais locais de integrações reais durante os testes',()=>{
  expect(Boolean(env.AFFILIATE_CATALOG_GATEWAY_URL)).toBe(false)
  expect(Boolean(env.AFFILIATE_CATALOG_GATEWAY_KEY)).toBe(false)
  expect(Boolean(env.AFFILIATE_EVOLUTION_API_KEY)).toBe(false)
  expect(Boolean(process.env.AFFILIATE_SERVICE_KEY)).toBe(false)
})
