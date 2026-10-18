import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ProfileScheduleDialog } from './profile-schedule-dialog'
afterEach(cleanup)
it('F14-C01 validates dates, retains input on error, and applies a UTC draft explicitly', () => {
  const apply=vi.fn();render(<ProfileScheduleDialog allowed onApply={apply} onClose={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Começar a mostrar'),{target:{value:'17/10/2026 15:00'}})
  fireEvent.change(screen.getByLabelText('Parar de mostrar'),{target:{value:'17/10/2026 14:00'}})
  fireEvent.click(screen.getByRole('button',{name:'Aplicar ao rascunho'}));expect(apply).not.toHaveBeenCalled();expect(screen.getByRole('alert').textContent).toContain('depois')
  fireEvent.change(screen.getByLabelText('Parar de mostrar'),{target:{value:'17/10/2026 16:00'}})
  fireEvent.click(screen.getByRole('button',{name:'Aplicar ao rascunho'}));expect(apply).toHaveBeenCalledTimes(1)
  expect(apply.mock.calls[0][0]).toMatchObject({paused:false});expect(apply.mock.calls[0][0].startsAt).toMatch(/Z$/)
})
it('F14-C02 expired capability allows removing existing schedule but exposes no privileged fields or false save', () => {
  const apply=vi.fn();render(<ProfileScheduleDialog allowed={false} schedule={{startsAt:null,endsAt:null,timeZone:'UTC',paused:true}} onApply={apply} onClose={vi.fn()} />)
  expect(screen.queryByLabelText('Começar a mostrar')).toBeNull()
  expect(screen.queryByRole('button',{name:'Aplicar ao rascunho'})).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Remover agendamento'}));expect(apply).toHaveBeenCalledWith(null)
})
