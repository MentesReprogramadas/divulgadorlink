import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { affiliateRequest, cents } from './contracts'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
beforeEach(() => vi.clearAllMocks())

describe('preços da central de afiliados', () => {
  it.each([['39,90', 3990], ['39.9', 3990], ['0,01', 1], ['R$ 99,00', 9900]])('converte %s em centavos sem arredondamento de exibição', (input, expected) => expect(cents(input)).toBe(expected))
  it.each(['0', '-1', '1.234,56', '39,999', '1e3', 'NaN', '1000000,01'])('rejeita preço ambíguo ou inválido %s', input => expect(() => cents(input)).toThrow('Informe um preço válido'))
})
it('usa o espaço pessoal para a feature exclusiva de admin e preserva erro da API', async () => {
  vi.mocked(api).mockResolvedValue({ status: 403, body: { message: 'Administrador inativo.' } })
  await expect(affiliateRequest('/segments', 'POST', { name: 'Natal' })).rejects.toThrow('Administrador inativo.')
  expect(api).toHaveBeenCalledWith('/v1/admin/affiliates/segments', expect.objectContaining({ headers: { 'x-workspace-owner': 'self' }, method: 'POST', body: JSON.stringify({ name: 'Natal' }) }))
})
