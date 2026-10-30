import { StrictMode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { SegmentJoin } from './segment-join'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
vi.mock('@/components/ui/liquid-lens', () => ({ LiquidLens: () => null }))
afterEach(() => { cleanup(); vi.clearAllMocks(); delete window.__temlinkEarlyAffiliateInvite })

it('adota falha do head em StrictMode sem repetir visita ou join e permite retry manual', async () => {
  window.__temlinkEarlyAffiliateInvite = { slug:'natal', visitStarted:true, state:'error', error:'Conferindo a conexão', promise:Promise.resolve() }
  vi.mocked(api).mockResolvedValue({status:503,body:{message:'Sem vagas agora'}})
  render(<StrictMode><SegmentJoin slug="natal" initialSegment={{name:'Natal',description:'',available:true,joinMode:'REDIRECT'}} /></StrictMode>)
  expect((await screen.findByRole('alert')).textContent).toContain('Conferindo a conexão')
  expect(api).not.toHaveBeenCalled()
  expect(window.__temlinkEarlyAffiliateInvite).toBeUndefined()
  fireEvent.click(screen.getByRole('button',{name:'Tentar novamente'}))
  expect((await screen.findByRole('alert')).textContent).toContain('Sem vagas agora')
  expect(api).toHaveBeenCalledOnce()
  expect(JSON.parse(vi.mocked(api).mock.calls[0][1]!.body as string).source).toBe('BUTTON')
})

it('acompanha promessa do head em andamento sem nova chamada e adota erro posterior', async () => {
  let finish!: () => void
  const early = {slug:'natal',visitStarted:true,state:'pending' as 'pending'|'error',error:undefined as string|undefined,promise:new Promise<void>(resolve => {finish=resolve})}
  window.__temlinkEarlyAffiliateInvite = early
  render(<StrictMode><SegmentJoin slug="natal" initialSegment={{name:'Natal',description:'',available:true,joinMode:'REDIRECT'}} /></StrictMode>)
  expect(api).not.toHaveBeenCalled()
  expect(screen.getByRole('status').textContent).toContain('Conferindo um grupo')
  early.state='error';early.error='O grupo foi pausado';finish()
  expect((await screen.findByRole('alert')).textContent).toContain('O grupo foi pausado')
  expect(api).not.toHaveBeenCalled()
})

it('não adota operação de outro slug', async () => {
  window.__temlinkEarlyAffiliateInvite={slug:'outro',visitStarted:true,state:'redirected',promise:Promise.resolve()}
  vi.mocked(api).mockImplementation(async path=>path.endsWith('/join')?{status:503,body:{message:'Confira novamente'}}:{status:200,body:{ok:true}})
  render(<SegmentJoin slug="natal" initialSegment={{name:'Natal',description:'',available:true,joinMode:'REDIRECT'}} />)
  expect((await screen.findByRole('alert')).textContent).toContain('Confira novamente')
  expect(vi.mocked(api).mock.calls.filter(([path])=>path.endsWith('/visit'))).toHaveLength(1)
  expect(vi.mocked(api).mock.calls.filter(([path])=>path.endsWith('/join'))).toHaveLength(1)
})

it('um novo carregamento React do mesmo convite não fica preso ao resultado antigo do head', async () => {
  window.__temlinkEarlyAffiliateInvite={slug:'natal',visitStarted:true,state:'error',error:'Primeira tentativa',promise:Promise.resolve()}
  vi.mocked(api).mockImplementation(async path=>path.endsWith('/join')?{status:503,body:{message:'Nova tentativa'}}:{status:200,body:{ok:true}})
  const first=render(<SegmentJoin slug="natal" initialSegment={{name:'Natal',description:'',available:true,joinMode:'REDIRECT'}} />)
  await screen.findByText('Primeira tentativa')
  first.unmount()
  render(<SegmentJoin slug="natal" initialSegment={{name:'Natal',description:'',available:true,joinMode:'REDIRECT'}} />)
  expect((await screen.findByRole('alert')).textContent).toContain('Nova tentativa')
  expect(vi.mocked(api).mock.calls.filter(([path])=>path.endsWith('/visit'))).toHaveLength(1)
  expect(vi.mocked(api).mock.calls.filter(([path])=>path.endsWith('/join'))).toHaveLength(1)
})

it('usa os dados já renderizados no servidor sem repetir GET e mantém medição e clique', async()=>{
  vi.mocked(api).mockImplementation(async path=>path.endsWith('/join')?{status:503,body:{message:'Conferindo vagas'}}:{status:200,body:{ok:true}})
  render(<StrictMode><SegmentJoin slug="natal" initialSegment={{name:'Natal',description:'',available:true,joinMode:'SCREEN'}} /></StrictMode>)
  expect(screen.getByRole('heading',{name:'Natal'})).toBeTruthy()
  await waitFor(()=>expect(vi.mocked(api).mock.calls.filter(([path])=>path.endsWith('/visit'))).toHaveLength(1))
  expect(vi.mocked(api).mock.calls.filter(([path])=>path.endsWith('/natal'))).toHaveLength(0)
  fireEvent.click(screen.getByRole('button',{name:'Entrar no grupo de WhatsApp'}))
  expect((await screen.findByRole('alert')).textContent).toContain('Conferindo vagas')
})

it('redirecionamento com dados iniciais inicia uma vez e não espera outro GET de metadados',async()=>{
  vi.mocked(api).mockImplementation(async path=>path.endsWith('/join')?{status:503,body:{message:'Confira a conexão'}}:{status:200,body:{ok:true}})
  render(<StrictMode><SegmentJoin slug="natal" initialSegment={{name:'Natal',description:'',available:true,joinMode:'REDIRECT'}} /></StrictMode>)
  expect((await screen.findByRole('alert')).textContent).toContain('Confira a conexão')
  expect(vi.mocked(api).mock.calls.filter(([path])=>path.endsWith('/natal'))).toHaveLength(0)
  expect(vi.mocked(api).mock.calls.filter(([path])=>path.endsWith('/join'))).toHaveLength(1)
})

it('redirecionamento padrão consulta uma vez mesmo em StrictMode e permite repetir falha manualmente', async () => {
  vi.mocked(api).mockImplementation(async path => path.endsWith('/join') ? { status: 503, body: { message: 'WhatsApp indisponível' } } : { status: 200, body: { name: 'Natal', description: '', available: true } })
  render(<StrictMode><SegmentJoin slug="natal" /></StrictMode>)
  expect((await screen.findByRole('alert')).textContent).toContain('WhatsApp indisponível')
  expect(vi.mocked(api).mock.calls.filter(([path]) => path.endsWith('/join'))).toHaveLength(1)
  expect(vi.mocked(api).mock.calls.filter(([path]) => path.endsWith('/visit'))).toHaveLength(1)
  expect(JSON.parse(vi.mocked(api).mock.calls.find(([path]) => path.endsWith('/join'))![1]!.body as string).source).toBe('AUTOMATIC')
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  await waitFor(() => expect(vi.mocked(api).mock.calls.filter(([path]) => path.endsWith('/join'))).toHaveLength(2))
  expect(JSON.parse(vi.mocked(api).mock.calls.filter(([path]) => path.endsWith('/join'))[1][1]!.body as string).source).toBe('BUTTON')
})

it('tela opcional só consulta grupo após clique e bloqueia destino externo', async () => {
  vi.mocked(api).mockImplementation(async path => path.endsWith('/join') ? { status: 200, body: { url: 'https://evil.test/invite' } } : { status: 200, body: { name: 'Natal', description: '', available: true, joinMode: 'SCREEN' } })
  render(<SegmentJoin slug="natal" />)
  await screen.findByRole('heading', { name: 'Natal' })
  expect(vi.mocked(api).mock.calls.filter(([path]) => path.endsWith('/join'))).toHaveLength(0)
  fireEvent.click(screen.getByRole('button', { name: 'Entrar no grupo de WhatsApp' }))
  expect((await screen.findByRole('alert')).textContent).toContain('convite retornado não é válido')
})

it('falha na medição não impede a abertura do convite', async () => {
  vi.mocked(api).mockImplementation(async path => {
    if (path.endsWith('/visit')) throw new Error('analytics offline')
    return path.endsWith('/join') ? { status: 503, body: { message: 'Conferindo vagas' } } : { status: 200, body: { name: 'Natal', description: '', available: true } }
  })
  render(<SegmentJoin slug="natal" />)
  expect((await screen.findByRole('alert')).textContent).toContain('Conferindo vagas')
  expect(vi.mocked(api).mock.calls.filter(([path]) => path.endsWith('/join'))).toHaveLength(1)
})
