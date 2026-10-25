import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import { MetricChartRenderer } from './metric-chart-renderer'

afterEach(cleanup)

it('permite consultar o valor e o rótulo completo do gráfico pelo teclado', async () => {
  render(<MetricChartRenderer kind="ranking" label="Cliques por link" rows={[{ label: 'Comunidade de leitura e conversas', value: 42 }]} />)
  const chart = screen.getByRole('application', { name: 'Cliques por link' })
  chart.focus()
  await userEvent.setup().keyboard('{ArrowDown}')
  await waitFor(() => {
    const announcement = screen.getByRole('status')
    expect(announcement.textContent).toContain('Comunidade de leitura e conversas')
    expect(announcement.textContent).toContain('42')
  })
})
