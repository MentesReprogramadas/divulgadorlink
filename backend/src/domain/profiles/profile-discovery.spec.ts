import { expect, it } from 'vitest'
import { discoverable, discoveryInput, discoveryQuery } from './profile-discovery'
it('F24-U01 exclui rascunho, privado, suspenso, restrito e página sem destinos visíveis', () => {
  const valid = { enabled: true, published: true, active: true, restricted: false, items: 1 }
  expect(discoverable(valid)).toBe(true)
  for (const patch of [{ enabled: false }, { published: false }, { active: false }, { restricted: true }, { items: 0 }]) expect(discoverable({ ...valid, ...patch })).toBe(false)
})
it('F24-U05 valida filtros, rejeita cursor inválido e propriedades não autorizadas', () => {
  expect(discoveryQuery.parse({ q: ' Ana ' }).q).toBe('Ana')
  expect(discoveryQuery.safeParse({ cursor: 'inválido' }).success).toBe(false)
  expect(discoveryInput.safeParse({ enabled: true, nicheId: null, tenantId: 'outro' }).success).toBe(false)
})
