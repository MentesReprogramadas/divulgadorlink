import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { InviteMetrics } from './invite-metrics'

vi.mock('@/components/ui/liquid-lens', () => ({ LiquidLens: () => null }))
afterEach(cleanup)

it('separa visitas, cliques e saídas automáticas de saídas pelo botão', () => {
  render(<InviteMetrics metrics={{ views: 120, buttonClicks: 18, automaticRedirects: 70, buttonRedirects: 15, createdAt: '2026-10-29T15:00:00Z' }} />)
  expect(screen.getByText('Visitas ao convite').nextElementSibling?.textContent).toBe('120')
  expect(screen.getByText('Cliques no botão').nextElementSibling?.textContent).toBe('18')
  expect(screen.getByText('Encaminhamentos ao WhatsApp').nextElementSibling?.textContent).toBe('85')
  expect(screen.getByText('70 automáticos · 15 pelo botão')).toBeTruthy()
  expect(screen.getByText(/não confirmam participação/)).toBeTruthy()
})

it('mostra zero antes dos primeiros eventos, sem inventar histórico', () => {
  render(<InviteMetrics />)
  expect(screen.getAllByText('0')).toHaveLength(3)
  expect(screen.getByText(/Aguardando os primeiros acessos/)).toBeTruthy()
})
