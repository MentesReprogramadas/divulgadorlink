import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { OfferCountdown, OfferDeadlineBanner } from './offer-countdown'
afterEach(() => { cleanup(); vi.useRealTimers() })
it('altera somente os dígitos necessários sem anunciar cada segundo', async () => {
 vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-04T10:00:00Z'))
 const view = render(<OfferCountdown expiresAt="2026-11-04T10:00:59Z" />)
 const time = view.container.querySelector('time')!
 expect(time.getAttribute('aria-live')).toBe('off')
 expect(view.container.querySelector('[class*=changedValue]')).toBeNull()
 expect(time.getAttribute('aria-label')).toContain('04/11/2026')
 const firstDigit = time.querySelector('span > span > span')
 const lastDigit = time.querySelector('span > span:last-child > span')
 await act(async () => { vi.advanceTimersByTime(1000) })
 expect(time.textContent).toBe('00:00:58')
 expect(view.container.querySelectorAll('[class*=changedValue]')).toHaveLength(1)
 expect(time.querySelector('span > span > span')).toBe(firstDigit)
 expect(time.querySelector('span > span:last-child > span')).not.toBe(lastDigit)
})
it('avisa expiração uma vez e mantém prazo absoluto', async () => {
 vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-04T10:00:00Z'))
 const onExpire = vi.fn()
 render(<OfferDeadlineBanner expiresAt="2026-11-04T10:00:01Z" onExpire={onExpire} />)
 await act(async () => { vi.advanceTimersByTime(2000) })
 expect(screen.getByText('Oferta encerrada')).toBeTruthy()
 expect(onExpire).toHaveBeenCalledTimes(1)
})

it('posiciona faixa no alvo do cabeçalho compartilhado quando disponível', () => {
 const target = document.createElement('div'); target.id = 'promotion-offer-banner'; document.body.appendChild(target)
 const view = render(<main><h1>Comprar destaque</h1><OfferDeadlineBanner expiresAt="2099-11-04T10:00:01Z" /></main>)
 expect(view.container.querySelector('aside')).toBeNull()
 expect(target.querySelector('aside')?.getAttribute('aria-label')).toBe('Prazo da oferta de destaque')
 view.unmount(); target.remove()
})
