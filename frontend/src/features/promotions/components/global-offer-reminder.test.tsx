import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { GlobalOfferReminder } from './global-offer-reminder'
const { api, route } = vi.hoisted(() => ({ api: vi.fn(), route: { pathname: '/busca' } }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }))
vi.mock('./launch-offer-reminder', () => ({ LaunchOfferReminder: ({ enabled }: { enabled: boolean }) => enabled ? <aside>Recuperação autorizada</aside> : null }))
beforeEach(() => { api.mockReset(); route.pathname = '/busca' })
afterEach(cleanup)
it('confere sessão e espaço no servidor antes de mostrar recuperação global', async () => {
 api.mockImplementation((path: string) => Promise.resolve({ status: 200, body: path === '/v1/auth/session' ? { status: 'ACTIVE', canSubmit: true } : { ownerId: null, grants: null } }))
 render(<GlobalOfferReminder />)
 expect(await screen.findByText('Recuperação autorizada')).toBeTruthy()
 expect(api).toHaveBeenCalledWith('/v1/team/context')
})
it.each([
 ['ausência de sessão', 401, {}, { ownerId: null }],
 ['suspensão', 200, { status: 'BANNED', canSubmit: true }, { ownerId: null }],
 ['verificação pendente', 200, { status: 'ACTIVE', canSubmit: false }, { ownerId: null }],
 ['espaço compartilhado mesmo com grant', 200, { status: 'ACTIVE', canSubmit: true }, { ownerId: 'tenant', grants: { links: { read: true, write: true } } }],
])('não expõe recuperação com %s', async (_name, status, session, context) => {
 api.mockImplementation((path: string) => Promise.resolve({ status: path === '/v1/auth/session' ? status : 200, body: path === '/v1/auth/session' ? session : context }))
 await act(async () => { render(<GlobalOfferReminder />) })
 expect(screen.queryByText('Recuperação autorizada')).toBeNull()
})
it('não consulta em rotas administrativas, cadastro, compra ou preview', () => {
 for (const pathname of ['/admin/visao', '/painel/links/novo', '/painel/links/link/destaque', '/painel/perfil/previa', '/p/comunidade']) { route.pathname = pathname; const view = render(<GlobalOfferReminder />); view.unmount() }
 expect(api).not.toHaveBeenCalled()
})
it('revalida permissão após troca de espaço e remove faixa anterior imediatamente', async () => {
 let ownerId: string | null = null
 api.mockImplementation((path: string) => Promise.resolve({ status: 200, body: path === '/v1/auth/session' ? { status: 'ACTIVE', canSubmit: true } : { ownerId } }))
 render(<GlobalOfferReminder />)
 await screen.findByText('Recuperação autorizada')
 ownerId = 'tenant'
 await act(async () => { window.dispatchEvent(new Event('workspace-access-changed')) })
 expect(screen.queryByText('Recuperação autorizada')).toBeNull()
})
