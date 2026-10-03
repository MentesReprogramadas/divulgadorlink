import { describe, expect, it, vi } from 'vitest'
import { ResendMailer } from '@/adapters/notifications/resend-mailer'

const email = {
  to: 'ana@example.com',
  subject: 'código',
  html: '<p>482913</p>',
  text: '482913',
  kind: 'otp' as const,
}

describe('Resend', () => {
  it('envia html e texto sem devolver o destinatário no erro', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    const mailer = new ResendMailer('re_test', 'Tem Link Aqui <oi@tem.test>', fetchImpl)

    await mailer.send(email, new AbortController().signal)

    expect(fetchImpl).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ authorization: 'Bearer re_test' }),
    }))
    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body))
    expect(body).toMatchObject({
      from: 'Tem Link Aqui <oi@tem.test>',
      to: ['ana@example.com'],
      subject: 'código',
      html: '<p>482913</p>',
      text: '482913',
    })
    expect(body.kind).toBeUndefined()
  })

  it('falha com o status e sem o corpo da resposta', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'ana@example.com rejeitado',
    })
    const mailer = new ResendMailer('re_test', 'Tem Link Aqui <oi@tem.test>', fetchImpl)

    await expect(mailer.send(email)).rejects.toThrow('resend_422')
  })

  it('remetente inválido não devolve o endereço no erro', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'Invalid `from` field. ana@example.com',
    })
    const mailer = new ResendMailer('re_test', 'Tem Link Aqui <oi@tem.test>', fetchImpl)

    const failure = mailer.send(email)
    await expect(failure).rejects.toThrow('remetente rejeitado')
    await expect(failure).rejects.not.toThrow(/ana@example.com/)
  })
})
