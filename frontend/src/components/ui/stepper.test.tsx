import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Stepper } from './stepper'

afterEach(cleanup)
it('anuncia a etapa atual, permite voltar e impede pular etapas', () => {
  const back = vi.fn()
  render(<Stepper steps={['Identidade', 'WhatsApp', 'Revisão']} current={1} onBack={back} />)
  expect(screen.getByText('WhatsApp').closest('li')?.getAttribute('aria-current')).toBe('step')
  fireEvent.click(screen.getByRole('button', { name: /Identidade.*concluída/ }))
  expect(back).toHaveBeenCalledWith(0)
  expect((screen.getByRole('button', { name: /Revisão.*próxima etapa/ }) as HTMLButtonElement).disabled).toBe(true)
})
