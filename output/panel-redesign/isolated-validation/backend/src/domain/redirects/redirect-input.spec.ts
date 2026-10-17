import { expect, it } from 'vitest'
import { createRedirectInput, destinationInput, redirectHandle } from './redirect-input'

const destination = { destinationUrl: 'https://example.com/convite', label: 'Grupo de estudos', requiresAge: false, expectedRevision: 0, requestKey: 'b3cf819d-ecef-4e04-913f-60c50b1bfaa1' }
it('F12-U01 uma proposta exige revisão esperada e chave estável de reenvio', () => {
  expect(destinationInput.parse(destination)).toEqual(destination)
  for (const bad of [{ ...destination, expectedRevision: -1 }, { ...destination, expectedRevision: 1.5 }, { ...destination, requestKey: '' }, { ...destination, ownerId: 'intruso' }]) expect(destinationInput.safeParse(bad).success).toBe(false)
})
it('F12-U02 recusa esquemas perigosos e credenciais antes da canonicalização', () => {
  for (const destinationUrl of ['javascript:alert(1)', 'data:text/plain,a', 'http://example.com', 'https://user:secret@example.com', 'https://example.com:8443']) expect(destinationInput.safeParse({ ...destination, destinationUrl }).success).toBe(false)
})
it('F12-U03 a identidade pública não faz parte de uma alteração de destino', () => {
  expect(destinationInput.safeParse({ ...destination, handle: 'outro-endereco' }).success).toBe(false)
  expect(redirectHandle.safeParse('b3cf819d-ecef-4e04-913f-60c50b1bfaa1').success).toBe(true)
  for (const handle of ['../login', 'https://evil.test', 'qualquer-coisa']) expect(redirectHandle.safeParse(handle).success).toBe(false)
})
it('F12-U01 criação não aceita versão de um endereço já existente nem campos extras', () => {
  expect(createRedirectInput.safeParse(destination).success).toBe(true)
  expect(createRedirectInput.safeParse({ ...destination, expectedRevision: 1 }).success).toBe(false)
  expect(destinationInput.safeParse({ ...destination, label: ' '.repeat(5) }).success).toBe(false)
  expect(destinationInput.safeParse({ ...destination, destinationUrl: 'https://example.com/' + 'a'.repeat(2048) }).success).toBe(false)
})
