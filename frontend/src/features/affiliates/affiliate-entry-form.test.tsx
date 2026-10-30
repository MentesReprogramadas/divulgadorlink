import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AffiliateEntryForm } from './affiliate-entry-form'
vi.mock('@/components/ui/liquid-lens', () => ({ LiquidLens: () => null }))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: undefined }) })
it('allows no consent, strips phone and attribution and preserves the form on an error', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }); vi.stubGlobal('fetch', fetch)
  render(<AffiliateEntryForm slug="natal" />)
  expect(screen.getByRole('checkbox', { name: 'Autorizo usar meu número e compartilhar meu cadastro e a confirmação de ingresso com a Meta para medir e otimizar anúncios.' })).toBeDefined()
  const phone = screen.getByLabelText('Seu WhatsApp com DDD') as HTMLInputElement
  fireEvent.change(phone, { target: { value: '(11) 99999-9999' } })
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Continuar para o WhatsApp' }))
  await screen.findByRole('alert')
  expect(phone.value).toBe('(11) 99999-9999')
  expect(fetch.mock.calls[0][1].credentials).toBe('omit')
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ phone: '', marketingConsent: false })
  expect(JSON.parse(fetch.mock.calls[0][1].body).fbclid).toBeUndefined()
})
it('blocks unsafe destinations, accepts consent explicitly, suppresses consent under DNT, and prevents double submit', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ joinUrl: 'https://evil.test/ofertas/entrar/natal' }) }); vi.stubGlobal('fetch', fetch)
  render(<AffiliateEntryForm slug="natal" />)
  fireEvent.change(screen.getByLabelText('Seu WhatsApp com DDD'), { target: { value: '+55 11 99999-9999' } }); fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.submit(document.querySelector('form')!); fireEvent.submit(document.querySelector('form')!)
  await screen.findByRole('alert'); expect(fetch).toHaveBeenCalledOnce()
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ marketingConsent: true, phone: '+55 11 99999-9999' })
  Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: '1' })
  fireEvent.submit(document.querySelector('form')!)
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ marketingConsent: false, phone: '' })
})
