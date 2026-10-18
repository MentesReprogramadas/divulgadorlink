import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react'
import { afterEach,expect,it,vi } from 'vitest'
import { QrDialog } from './qr-dialog'
import { stableQrTarget } from './qr-target'
import type { QrArtifact } from './generate-qr'
const {generate,download}=vi.hoisted(()=>({generate:vi.fn(),download:vi.fn()}))
vi.mock('./generate-qr',()=>({generateQr:generate,downloadQr:download}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
const target=stableQrTarget('https://temlinkaqui.com',{kind:'PROFILE',path:'/p/pagina-publicada'})
const artifact=(url=target.url):QrArtifact=>({url,format:'png',size:512,mime:'image/png',filename:'pagina.png',preview:'data:image/png;base64,Zml4dHVyZQ==',blob:new Blob(['fixture'],{type:'image/png'})})
it('F13-C01 preview has a stable loading region and enables download only after generation',async()=>{
  let finish!:(value:QrArtifact)=>void;generate.mockImplementation(()=>new Promise(resolve=>{finish=resolve}));render(<QrDialog target={target} onClose={()=>{}}/>)
  expect(screen.getByRole('status',{name:'Gerando QR Code'})).toBeTruthy();const button=screen.getByRole('button',{name:'Baixar QR Code'});expect(button.hasAttribute('disabled')).toBe(true)
  fireEvent.click(button);expect(download).not.toHaveBeenCalled();finish(artifact())
  await screen.findByRole('img',{name:'QR Code da página publicada'});expect(button.hasAttribute('disabled')).toBe(false);fireEvent.click(button);expect(download).toHaveBeenCalledWith(artifact());expect(screen.getByRole('status').textContent).toContain('Download iniciado')
})
it('F13-C01 a failed generation preserves options, offers retry and never invents a downloadable result',async()=>{
  generate.mockRejectedValueOnce(new Error('Provider fixture'));render(<QrDialog target={target} onClose={()=>{}}/>);expect((await screen.findByRole('alert')).textContent).toContain('dados foram mantidos')
  expect(screen.queryByRole('img')).toBeNull();expect(screen.queryByRole('button',{name:'Baixar QR Code'})).toBeNull();generate.mockResolvedValueOnce(artifact());fireEvent.click(screen.getByRole('button',{name:'Tentar novamente'}));await screen.findByRole('img');expect(generate).toHaveBeenLastCalledWith(target,'png',512)
})
it('F13-C02 late generation cannot expose the previous target; output contains only the public address',async()=>{
  let first!:(value:QrArtifact)=>void;generate.mockImplementationOnce(()=>new Promise(resolve=>{first=resolve}));const view=render(<QrDialog target={target} onClose={()=>{}}/>)
  const next=stableQrTarget('https://temlinkaqui.com',{kind:'PROFILE',path:'/p/outra-pagina'});generate.mockResolvedValueOnce(artifact(next.url));view.rerender(<QrDialog target={next} onClose={()=>{}}/>);await screen.findByRole('img');first(artifact());await waitFor(()=>expect(screen.getByRole('button',{name:'Baixar QR Code'}).hasAttribute('disabled')).toBe(false))
  expect(view.container.textContent).toContain(next.url);expect(view.container.textContent).not.toContain(target.url);fireEvent.click(screen.getByRole('button',{name:'Baixar QR Code'}));expect(download.mock.calls[0][0].url).toBe(next.url)
})
