import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { FavoriteButton } from './favorite-button'
import { writeSession } from '@/domain/session'
vi.mock('@/lib/api', () => ({ api: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks(); sessionStorage.clear() })
it('uma leitura antiga não desfaz o estado confirmado depois de salvar',async()=>{
  writeSession({role:'USER',status:'ACTIVE',canSubmit:true})
  let resolveRead!:(r:{status:number;body:{saved:boolean}})=>void
  vi.mocked(api).mockImplementationOnce(()=>new Promise(done=>{resolveRead=done}))
  vi.mocked(api).mockResolvedValueOnce({status:200,body:{saved:true}})
  render(<FavoriteButton linkId="one" />)
  fireEvent.click(screen.getByRole('button',{name:'Salvar favorito'}))
  await screen.findByRole('button',{name:'Remover favorito'})
  await act(async()=>resolveRead({status:200,body:{saved:false}}))
  expect(screen.getByRole('button',{name:'Remover favorito'}).getAttribute('aria-pressed')).toBe('true')
})
it('F04-C01 no optimistic success, duplicate request blocked, failure preserves confirmed favorite state', async () => {
  let resolve: (r: { status: number; body: { saved: boolean } }) => void = () => {}
  vi.mocked(api).mockImplementationOnce(() => new Promise(done => { resolve = done }))
  render(<FavoriteButton linkId="one" />)
  const button = screen.getByRole('button', { name: 'Salvar favorito' })
  fireEvent.click(button); fireEvent.click(button)
  expect(api).toHaveBeenCalledTimes(1); expect(button.getAttribute('aria-pressed')).toBe('false')
  resolve({ status: 200, body: { saved: true } })
  await screen.findByRole('button', { name: 'Remover favorito' })
  vi.mocked(api).mockRejectedValueOnce(new Error('Sem conexão.'))
  fireEvent.click(screen.getByRole('button', { name: 'Remover favorito' }))
  await screen.findByRole('alert'); expect(screen.getByRole('button', { name: 'Remover favorito' }).getAttribute('aria-pressed')).toBe('true')
})

it('mantém a mensagem de erro numa superfície óptica própria e permite repetir a ação', async () => {
  vi.mocked(api).mockResolvedValueOnce({ status: 503, body: { message: 'Sem conexão. Tente novamente.' } })
  render(<FavoriteButton linkId="one" />)
  fireEvent.click(screen.getByRole('button', { name: 'Salvar favorito' }))
  const alert = await screen.findByRole('alert')
  expect(alert.textContent).toBe('Sem conexão. Tente novamente.')
  expect(alert.querySelector('[data-optics]')).not.toBeNull()
  expect(screen.getByRole('button', { name: 'Salvar favorito' }).getAttribute('aria-pressed')).toBe('false')
  vi.mocked(api).mockResolvedValueOnce({ status: 200, body: { saved: true } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar favorito' }))
  await screen.findByRole('button', { name: 'Remover favorito' })
  expect(screen.queryByRole('alert')).toBeNull()
})
