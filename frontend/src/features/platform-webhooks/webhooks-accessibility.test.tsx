import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { WebhooksScreen } from './webhooks-screen'
import { webhookRequest } from './webhook-api'

vi.mock('./webhook-api', async () => ({ ...await vi.importActual('./webhook-api'), webhookRequest: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('preserva os destinos das abas quando a carga falha e permite tentar novamente', async () => {
  vi.mocked(webhookRequest).mockRejectedValueOnce(new Error('Integrações indisponíveis.')).mockResolvedValue({ configured: true, endpoints: [], deliveries: [] })
  render(<WebhooksScreen />)
  await screen.findByRole('alert')
  const tabs = screen.getAllByRole('tab', { hidden: true })
  expect(tabs).toHaveLength(2)
  for (const tab of tabs) {
    const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '')
    expect(panel).not.toBeNull()
    expect(panel?.getAttribute('role')).toBe('tabpanel')
  }
  expect(document.getElementById('integration-area-panel-connections')?.hidden).toBe(false)
  expect(document.getElementById('integration-area-panel-deliveries')?.hidden).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
  expect(await screen.findByText(/Receba avisos em um sistema como n8n/)).toBeTruthy()
  expect(screen.queryByRole('alert')).toBeNull()
})
