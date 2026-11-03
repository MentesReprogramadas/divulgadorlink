import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { SendForm } from './affiliate-forms'
import type { AffiliateOffer } from './contracts'

afterEach(cleanup)
const message = 'Mais espaço na sua cozinha\n\n✨ Kit para organizar a cozinha\n\n🔥 *R$ 39,90*\n\nConfira o produto aqui 👇\nhttps://meli.la/oferta?tag=original'
const offer: AffiliateOffer = { id:'offer-1',segmentId:'segment-1',title:'Título cadastrado',message,productUrl:'https://produto.mercadolivre.com.br/MLB-123',affiliateUrl:'https://meli.la/oferta?tag=original',priceCents:3990,oldPriceCents:5990,note:'Texto complementar cadastrado',imageUrl:null,status:'DRAFT',checkedAt:'2026-10-28T12:00:00Z',expiresAt:null }

it('preserva a mensagem canônica e o contrato de aprovação', async () => {
  const save = vi.fn().mockResolvedValue(undefined)
  render(<SendForm offer={offer} groupCount={2} save={save}/>)
  expect(screen.getByLabelText('Mensagem para o WhatsApp').textContent).toBe(message)
  expect(screen.queryByText(offer.note)).toBeNull()
  expect(screen.queryByText('Título cadastrado')).toBeNull()
  expect(screen.queryByText(/Preço e estoque podem mudar/)).toBeNull()
  const confirm = screen.getByRole('checkbox')
  fireEvent.submit(confirm.closest('form')!)
  expect(save).not.toHaveBeenCalled()
  expect(await screen.findByRole('alert')).toBeTruthy()
  fireEvent.click(confirm)
  fireEvent.submit(confirm.closest('form')!)
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
  expect(save.mock.calls[0][0]).toEqual({idempotencyKey:expect.stringMatching(/^[a-f0-9-]{36}$/)})
  expect(screen.getByLabelText('Mensagem para o WhatsApp').textContent).toBe(message)
})

it('mantém três blocos quando uma API anterior não inclui a mensagem', () => {
  render(<SendForm offer={{...offer,message:undefined}} groupCount={1} save={vi.fn()}/>)
  const preview = screen.getByLabelText('Mensagem para o WhatsApp').textContent!
  expect(preview.split('\n\n')).toEqual([`🛍️ ${offer.title}`,expect.stringMatching(/^🔥 \*R\$\s39,90\*$/),`Confira o produto aqui 👇\n${offer.affiliateUrl}`])
  expect(preview).not.toContain(offer.note)
  expect(preview).not.toContain('59,90')
})
