import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ProfilePreviewScreen } from './profile-preview-screen'
import { emptyProfile } from './profile-contract'
const { request } = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('./profile-api', () => ({ profileRequest: request }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('carrega somente a prévia da sessão e mantém o aviso e o retorno visíveis', async () => {
  request.mockResolvedValueOnce({ ...emptyProfile(), name: 'Rascunho da Ana', restricted: false, publishedRevisionId: 1,search:{filters:{q:'',categoryId:null,cursor:null},groups:[],total:0,nextCursor:null} })
  render(<ProfilePreviewScreen />)
  await screen.findByRole('heading', { name: 'Rascunho da Ana' })
  expect(request).toHaveBeenCalledWith('/preview/items')
  expect(screen.getByRole('region', { name: 'Modo de prévia' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Voltar à edição' }).getAttribute('href')).toBe('/painel/perfil')
})
it('falha não revela dados, permite nova tentativa e preserva a barreira etária', async () => {
  request.mockRejectedValueOnce(new Error('Acesso negado.')).mockResolvedValueOnce({ restricted: true })
  render(<ProfilePreviewScreen />)
  expect((await screen.findByRole('alert')).textContent).toContain('Acesso negado.')
  expect(screen.queryByRole('article', { name: 'Perfil público' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
  await screen.findByRole('button', { name: 'Tenho 18 anos ou mais' })
  expect(screen.queryByRole('article', { name: 'Perfil público' })).toBeNull()
})
