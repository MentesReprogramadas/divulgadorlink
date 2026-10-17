import https from 'node:https'
import { EventEmitter } from 'node:events'
import type { ClientRequest, IncomingMessage } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultPinnedConnect, SAFE_FETCH_MAX_BODY_BYTES } from './safe-fetch'

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })
const target = { url: 'https://example.com', hostname: 'example.com', servername: 'example.com', address: '8.8.8.8' }
function requestFake(send: (response: IncomingMessage) => void) {
  const request = new EventEmitter() as ClientRequest
  const response = new EventEmitter() as IncomingMessage
  response.headers = {}; response.statusCode = 200
  request.destroy = ((error?: Error) => { if (error) queueMicrotask(() => request.emit('error', error)); return request }) as ClientRequest['destroy']
  response.destroy = (() => response) as IncomingMessage['destroy']
  request.end = (() => { send(response); return request }) as ClientRequest['end']
  vi.spyOn(https, 'request').mockImplementation(((_options: unknown, callback: (response: IncomingMessage) => void) => { queueMicrotask(() => callback(response)); return request }) as typeof https.request)
  return { response, request }
}
describe('F07 limite do transporte protegido', () => {
  it('F07-T04 conecta diretamente no IP validado com Host/SNI originais e TLS habilitado', async () => {
    const { response } = requestFake(() => {})
    const result = defaultPinnedConnect(target)
    await Promise.resolve()
    response.emit('end')
    await result
    const options = vi.mocked(https.request).mock.calls[0]?.[0] as import('node:https').RequestOptions
    expect(options.hostname).toBe(target.address)
    expect(options.servername).toBe('example.com')
    expect(options.headers).toMatchObject({ host: 'example.com' })
    expect(options.lookup).toBeUndefined()
    expect(options.rejectUnauthorized).not.toBe(false)
  })
  it('F07-T04 interrompe o fluxo acima de 1 MiB antes de esperar o final', async () => {
    const { response } = requestFake(() => {})
    const result = defaultPinnedConnect(target)
    const assertion = expect(result).rejects.toThrow(/limite/)
    await Promise.resolve()
    response.emit('data', Buffer.alloc(SAFE_FETCH_MAX_BODY_BYTES + 1))
    await assertion
  })
  it('F07-T04 prazo absoluto encerra resposta que continua transmitindo lentamente', async () => {
    vi.useFakeTimers()
    requestFake(() => {})
    const assertion = expect(defaultPinnedConnect(target)).rejects.toThrow(/timeout/)
    await vi.advanceTimersByTimeAsync(5001)
    await assertion
  })
})
