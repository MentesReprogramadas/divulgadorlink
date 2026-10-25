import { chooseSelect } from '@/test-select'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Page from './page'

const push = vi.fn()
const api = vi.fn()
const trackGoogleAdsLinkSubmission = vi.fn()
let areaSession = { role: 'USER', status: 'ACTIVE', canSubmit: true }
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => api(...args) }))
vi.mock('@/components/domain/panel', () => ({
  useAreaSession: () => areaSession,
}))
vi.mock('@/domain/meta-pixel', () => ({ trackMeta: () => undefined }))
vi.mock('@/domain/google-ads', () => ({
  trackGoogleAdsLinkSubmission: (...args: unknown[]) => trackGoogleAdsLinkSubmission(...args),
}))
vi.mock('@/features/link-media/prepare-link-media',()=>({prepareLinkMediaFile:vi.fn(async()=> 'cGl4ZWxz')}))
vi.mock('@/components/ui/liquid-lens', () => ({ LiquidLens: () => <span aria-hidden="true" /> }))

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.open = true }
  localStorage.clear()
  areaSession = { role: 'USER', status: 'ACTIVE', canSubmit: true }
  push.mockReset()
  api.mockReset()
  trackGoogleAdsLinkSubmission.mockReset()
  api.mockImplementation((path: string) => {
    if (path === '/v1/catalog/discovery-options') return Promise.resolve({ status: 200, body: { languages: [], cities: [], selectedCity: null, modalities: [] } })
    if (path === '/v1/home') {
      return Promise.resolve({
        status: 200,
        body: {
          networks: [{ id: 'net', name: 'Site', slug: 'site' }],
          niches: [{ id: 'niche', name: 'Jogos', slug: 'jogos' }],
        },
      })
    }
    if (String(path).startsWith('/v1/links/mine')) return Promise.resolve({ status: 200, body: { slotsUsed: 1 } })
    return Promise.resolve({ status: 200, body: {} })
  })
})

afterEach(() => { cleanup(); vi.restoreAllMocks() })

async function fillAndSend() {
  fireEvent.change(await screen.findByLabelText('Título do link'), { target: { value: 'Grupo' } })
  fireEvent.change(screen.getByLabelText('Link de acesso'), { target: { value: 'https://example.com/grupo' } }); fireEvent.click(screen.getByRole('button', { name: 'Continuar' })); fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Descrição do grupo' } })
  fireEvent.change(screen.getByLabelText('Link de acesso'), { target: { value: 'https://example.com/grupo' } })
  await chooseSelect(screen.getByLabelText('Rede do link'), 'net')
  await chooseSelect(screen.getByLabelText('Assunto do link'), 'niche')
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' })); fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
}

describe('envio de link', () => {
  it('resume campos inválidos da etapa e leva o foco aos controles sem perder valores', async () => {
    render(<Page />)
    fireEvent.change(await screen.findByLabelText('Link de acesso'), { target: { value: 'http://example.com/grupo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    const summary = await screen.findByRole('region', { name: 'Confira os campos desta etapa' })
    expect(document.activeElement).toBe(summary)
    const links = within(summary).getAllByRole('link')
    expect(links.map(link => link.textContent)).toEqual(['Título do link', 'Link de acesso'])
    for (const link of links) {
      fireEvent.click(link)
      expect(document.activeElement?.id).toBe(link.getAttribute('href')!.slice(1))
    }
    expect((screen.getByLabelText('Link de acesso') as HTMLInputElement).value).toBe('http://example.com/grupo')
    expect(api.mock.calls.some(([path]) => path === '/v1/links')).toBe(false)
  })

  it('inclui selects obrigatórios no resumo e foca seus controles visíveis', async () => {
    render(<Page />)
    fireEvent.change(await screen.findByLabelText('Título do link'), { target: { value: 'Grupo' } })
    fireEvent.change(screen.getByLabelText('Link de acesso'), { target: { value: 'https://example.com/grupo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    const summary = await screen.findByRole('region', { name: 'Confira os campos desta etapa' })
    expect(within(summary).getAllByRole('link').map(link => link.textContent)).toEqual(['Descrição', 'Rede do link', 'Assunto do link'])
    fireEvent.click(within(summary).getByRole('link', { name: 'Rede do link' }))
    expect(document.activeElement).toBe(screen.getByLabelText('Rede do link'))
    expect(document.activeElement?.getAttribute('role')).toBe('combobox')
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Descrição do grupo' } })
    await chooseSelect(screen.getByLabelText('Rede do link'), 'net')
    await chooseSelect(screen.getByLabelText('Assunto do link'), 'niche')
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.queryByRole('region', { name: 'Confira os campos desta etapa' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeTruthy()
  })

  it('aceita HTTPS em maiúsculas e inclui a descrição obrigatória da imagem no resumo', async () => {
    render(<Page />)
    fireEvent.change(await screen.findByLabelText('Título do link'), { target: { value: 'Grupo' } })
    fireEvent.change(screen.getByLabelText('Link de acesso'), { target: { value: 'HTTPS://EXAMPLE.COM/grupo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Descrição do grupo' } })
    await chooseSelect(screen.getByLabelText('Rede do link'), 'net')
    await chooseSelect(screen.getByLabelText('Assunto do link'), 'niche')
    fireEvent.change(screen.getByLabelText('Imagem do link (opcional)'), { target: { files: [new File(['pixels'], 'image.png', { type: 'image/png' })] } })
    await screen.findByRole('img', { name: 'Prévia da imagem escolhida' })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    const summary = await screen.findByRole('region', { name: 'Confira os campos desta etapa' })
    expect(within(summary).getAllByRole('link')).toHaveLength(1)
    fireEvent.click(within(summary).getByRole('link', { name: 'Descrição da imagem' }))
    expect(document.activeElement).toBe(screen.getByLabelText('Descrição da imagem'))
    expect(screen.getByRole('img', { name: 'Prévia da imagem escolhida' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Descrição da imagem'), { target: { value: 'Pessoas estudando' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeTruthy()
  })

  it('continua editando e enviando quando o armazenamento está indisponível', async () => {
    const defaultApi = api.getMockImplementation()!
    api.mockImplementation((path: string, init?: RequestInit) => path === '/v1/links' && init?.method === 'POST'
      ? Promise.resolve({ status: 201, body: { id: 'link-storage', status: 'PENDING_MODERATION' } }) : defaultApi(path, init))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
    render(<Page />)
    await fillAndSend()
    expect(await screen.findByRole('heading', { name: 'Enviado para análise.' })).toBeTruthy()
    expect(trackGoogleAdsLinkSubmission).toHaveBeenCalledExactlyOnceWith('link-storage')
    fireEvent.click(screen.getByRole('button', { name: 'Ver meus links' }))
  })

  it('avisa quando não salva e mantém valores e etapa após falha de rede', async () => {
    const defaultApi = api.getMockImplementation()!
    api.mockImplementation((path: string, init?: RequestInit) => path === '/v1/links' && init?.method === 'POST'
      ? Promise.reject(new Error('offline')) : defaultApi(path, init))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError') })
    render(<Page />)
    await fillAndSend()
    expect(await screen.findByText(/Não foi possível salvar o rascunho neste navegador/)).toBeTruthy()
    expect(await screen.findByText(/Seu rascunho foi mantido/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect((screen.getByLabelText('Descrição') as HTMLTextAreaElement).value).toBe('Descrição do grupo')
    expect(screen.getByLabelText('Rede do link').textContent).toContain('Site')
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect((screen.getByLabelText('Título do link') as HTMLInputElement).value).toBe('Grupo')
  })

  it('não sobrescreve um rascunho quando a leitura inicial falha', async () => {
    localStorage.setItem('tla-link-draft', JSON.stringify({ name: 'Rascunho anterior', url: 'https://example.com/anterior' }))
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => { throw new DOMException('blocked', 'SecurityError') })
    render(<Page />)
    expect(await screen.findByText(/Não foi possível recuperar o rascunho salvo/)).toBeTruthy()
    read.mockRestore()
    expect(JSON.parse(localStorage.getItem('tla-link-draft')!).name).toBe('Rascunho anterior')
  })

  it('preserva o texto salvo inválido até a pessoa começar a editar', async () => {
    localStorage.setItem('tla-link-draft', '{rascunho incompleto')
    render(<Page />)
    expect(await screen.findByText(/Não foi possível recuperar o rascunho salvo/)).toBeTruthy()
    expect(localStorage.getItem('tla-link-draft')).toBe('{rascunho incompleto')
    fireEvent.change(screen.getByLabelText('Título do link'), { target: { value: 'Novo rascunho' } })
    expect(JSON.parse(localStorage.getItem('tla-link-draft')!).name).toBe('Novo rascunho')
    expect(screen.queryByText(/Não foi possível recuperar o rascunho salvo/)).toBeNull()
  })

  it('confirma o envio já aceito mesmo quando não consegue limpar o rascunho', async () => {
    const defaultApi = api.getMockImplementation()!
    api.mockImplementation((path: string, init?: RequestInit) => path === '/v1/links' && init?.method === 'POST'
      ? Promise.resolve({ status: 201, body: { id: 'link-clear', status: 'PENDING_MODERATION' } }) : defaultApi(path, init))
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError') })
    render(<Page />)
    await fillAndSend()
    expect(await screen.findByRole('heading', { name: 'Enviado para análise.' })).toBeTruthy()
    expect(screen.queryByText(/Não foi possível conectar/)).toBeNull()
    expect(screen.getByText(/não foi possível apagar o rascunho/)).toBeTruthy()
    expect(api.mock.calls.filter(([path]) => path === '/v1/links')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Ver meus links' }))
  })

  it.each(['network', 'http'])('recupera facetas e vagas após falha %s sem perder o que foi digitado', async failure => {
    const defaultApi = api.getMockImplementation()!
    let unavailable = true
    api.mockImplementation((path: string, init?: RequestInit) => {
      if (unavailable && (path === '/v1/home' || path.startsWith('/v1/links/mine') || path === '/v1/links/submission-started')) {
        return failure === 'network' ? Promise.reject(new Error('offline')) : Promise.resolve({ status: 503, body: {} })
      }
      return defaultApi(path, init)
    })
    render(<Page />)
    fireEvent.change(await screen.findByLabelText('Título do link'), { target: { value: 'Meu rascunho' } })
    expect(await screen.findByText(/Não foi possível carregar redes e assuntos/)).toBeTruthy()
    expect(await screen.findByText(/Não foi possível consultar as vagas/)).toBeTruthy()
    expect(screen.queryByRole('status', { name: 'Carregando vagas' })).toBeNull()
    unavailable = false
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar redes e assuntos' }))
    fireEvent.click(screen.getByRole('button', { name: 'Consultar vagas novamente' }))
    expect(await screen.findByText('Vagas em uso: 1 de 4.')).toBeTruthy()
    expect((screen.getByLabelText('Título do link') as HTMLInputElement).value).toBe('Meu rascunho')
    fireEvent.change(screen.getByLabelText('Link de acesso'), { target: { value: 'https://example.com/grupo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    await chooseSelect(screen.getByLabelText('Rede do link'), 'net')
    expect(screen.getByLabelText('Rede do link').textContent).toContain('Site')
  })

  it.each([{ status: 'ACTIVE', canSubmit: false }, { status: 'BANNED', canSubmit: true }])('preserva bloqueio de envio com sessão $status e canSubmit $canSubmit', async ({ status, canSubmit }) => {
    areaSession = { role: 'USER', status, canSubmit }
    render(<Page />)
    await screen.findByLabelText('Título do link')
    expect((screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement).disabled).toBe(true)
    expect(api.mock.calls.filter(([path, init]) => path === '/v1/links' && init?.method === 'POST')).toHaveLength(0)
  })
  it('mostra o card real com mídia e facetas na conferência sem criar saída nem impressão', async () => {
    render(<Page />)
    fireEvent.change(await screen.findByLabelText('Título do link'), { target: { value: 'Comunidade de estudos' } })
    fireEvent.change(screen.getByLabelText('Link de acesso'), { target: { value: 'https://example.com/estudos' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Encontros e materiais de estudo.' } })
    await chooseSelect(screen.getByLabelText('Rede do link'), 'net')
    await chooseSelect(screen.getByLabelText('Assunto do link'), 'niche')
    fireEvent.change(screen.getByLabelText('Imagem do link (opcional)'), { target: { files: [new File(['pixels'], 'image.png', { type: 'image/png' })] } })
    await screen.findByRole('img', { name: 'Prévia da imagem escolhida' })
    fireEvent.change(screen.getByLabelText('Descrição da imagem'), { target: { value: 'Pessoas estudando juntas' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    const card = within(screen.getByRole('region', { name: 'Prévia do link' }))
    expect(card.getByRole('heading', { name: 'Comunidade de estudos' })).toBeTruthy()
    expect(card.getByRole('img', { name: 'Pessoas estudando juntas' }).getAttribute('src')).toBe('data:image/webp;base64,cGl4ZWxz')
    expect(card.getByText('Jogos')).toBeTruthy()
    expect(card.getByText('Site')).toBeTruthy()
    expect(card.queryByRole('link')).toBeNull()
    expect(card.queryByRole('img', { name: /impress/ })).toBeNull()
    expect(api.mock.calls.filter(([path, init]) => path === '/v1/links' && init?.method === 'POST')).toHaveLength(0)
  })
  it('sends optional media atomically and keeps only text in the local draft after an error',async()=>{
    const defaultApi=api.getMockImplementation()!
    api.mockImplementation((path:string,init?:RequestInit)=>path==='/v1/links'&&init?.method==='POST'?Promise.resolve({status:503,body:{message:'Tente novamente.'}}):defaultApi(path,init))
    render(<Page/>)
    fireEvent.change(await screen.findByLabelText('Título do link'),{target:{value:'Comunidade'}})
    fireEvent.change(screen.getByLabelText('Link de acesso'),{target:{value:'https://example.com/comunidade'}})
    fireEvent.click(screen.getByRole('button',{name:'Continuar'}))
    fireEvent.change(screen.getByLabelText('Imagem do link (opcional)'),{target:{files:[new File(['pixels'],'image.png',{type:'image/png'})]}})
    await screen.findByRole('img',{name:'Prévia da imagem escolhida'})
    fireEvent.change(screen.getByLabelText('Descrição da imagem'),{target:{value:'Pessoas reunidas'}})
    await fillAndSend()
    await screen.findByRole('alert')
    const sent=api.mock.calls.find(([path,init])=>path==='/v1/links'&&init?.method==='POST')!
    expect(JSON.parse(sent[1].body).media).toEqual({image:{base64:'cGl4ZWxz',alt:'Pessoas reunidas'}})
    expect(localStorage.getItem('tla-link-draft')).not.toContain('cGl4ZWxz')
    expect(localStorage.getItem('tla-link-draft')).not.toContain('Pessoas reunidas')
  })
  it('mostra o resultado da fila e segue para os links', async () => {
    api.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/v1/links' && init?.method === 'POST') {
        return Promise.resolve({ status: 201, body: { id: 'link-1', status: 'PENDING_MODERATION' } })
      }
      if (path === '/v1/catalog/discovery-options') return Promise.resolve({ status: 200, body: { languages: [], cities: [], selectedCity: null, modalities: [] } })
    if (path === '/v1/home') {
        return Promise.resolve({
          status: 200,
          body: {
            networks: [{ id: 'net', name: 'Site', slug: 'site' }],
            niches: [{ id: 'niche', name: 'Jogos', slug: 'jogos' }],
          },
        })
      }
      return Promise.resolve({ status: 200, body: { slotsUsed: 0 } })
    })
    render(<Page />)
    await fillAndSend()
    expect(await screen.findByRole('heading', { name: 'Enviado para análise.' })).toBeTruthy()
    expect(screen.queryByText('Publicado')).toBeNull()
    expect(trackGoogleAdsLinkSubmission).toHaveBeenCalledExactlyOnceWith('link-1')
    await waitFor(() => expect(push).toHaveBeenCalledWith('/painel/links'), { timeout: 4000 })
  })

  it('mostra a recusa sem chamar de análise', async () => {
    api.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/v1/links' && init?.method === 'POST') {
        return Promise.resolve({ status: 201, body: { id: 'link-2', status: 'PRE_REJECTED', message: 'Envio não aceito.' } })
      }
      if (path === '/v1/catalog/discovery-options') return Promise.resolve({ status: 200, body: { languages: [], cities: [], selectedCity: null, modalities: [] } })
    if (path === '/v1/home') {
        return Promise.resolve({
          status: 200,
          body: {
            networks: [{ id: 'net', name: 'Site', slug: 'site' }],
            niches: [{ id: 'niche', name: 'Jogos', slug: 'jogos' }],
          },
        })
      }
      return Promise.resolve({ status: 200, body: {} })
    })
    render(<Page />)
    await fillAndSend()
    expect(await screen.findByRole('heading', { name: 'Envio não aceito' })).toBeTruthy()
    expect(screen.queryByText('Enviado para análise.')).toBeNull()
    expect(trackGoogleAdsLinkSubmission).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ver meus links' }))
    expect(push).toHaveBeenCalledWith('/painel/links')
  })

  it('deixa o erro no formulário quando o envio não entra', async () => {
    api.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/v1/links' && init?.method === 'POST') {
        return Promise.resolve({ status: 409, body: { message: 'Esse link já está no catálogo.' } })
      }
      if (path === '/v1/catalog/discovery-options') return Promise.resolve({ status: 200, body: { languages: [], cities: [], selectedCity: null, modalities: [] } })
    if (path === '/v1/home') {
        return Promise.resolve({
          status: 200,
          body: {
            networks: [{ id: 'net', name: 'Site', slug: 'site' }],
            niches: [{ id: 'niche', name: 'Jogos', slug: 'jogos' }],
          },
        })
      }
      return Promise.resolve({ status: 200, body: {} })
    })
    render(<Page />)
    await fillAndSend()
    expect((await screen.findByRole('alert')).textContent).toContain('Esse link já está no catálogo.')
    expect(screen.queryByRole('heading', { name: 'Enviado para análise.' })).toBeNull()
    expect(push).not.toHaveBeenCalled()
    expect(trackGoogleAdsLinkSubmission).not.toHaveBeenCalled()
  })

  it('conta link publicado automaticamente, mas não conta abrir o formulário', async () => {
    const defaultApi = api.getMockImplementation()!
    api.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/v1/links' && init?.method === 'POST') {
        return Promise.resolve({ status: 201, body: { id: 'link-published', status: 'PUBLISHED' } })
      }
      return defaultApi(path, init)
    })
    render(<Page />)
    await screen.findByLabelText('Título do link')
    expect(trackGoogleAdsLinkSubmission).not.toHaveBeenCalled()
    await fillAndSend()
    await waitFor(() => expect(trackGoogleAdsLinkSubmission).toHaveBeenCalledExactlyOnceWith('link-published'))
    fireEvent.click(screen.getByRole('button', { name: 'Ver meus links' }))
  })

  it('não conta falha de conexão e preserva o rascunho', async () => {
    const defaultApi = api.getMockImplementation()!
    api.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/v1/links' && init?.method === 'POST') return Promise.reject(new Error('offline'))
      return defaultApi(path, init)
    })
    render(<Page />)
    await fillAndSend()
    expect((await screen.findByRole('alert')).textContent).toContain('Seu rascunho foi mantido')
    expect(trackGoogleAdsLinkSubmission).not.toHaveBeenCalled()
    expect(localStorage.getItem('tla-link-draft')).toContain('https://example.com/grupo')
  })
})
