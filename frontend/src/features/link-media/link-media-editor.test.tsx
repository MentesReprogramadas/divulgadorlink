import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { LinkMediaEditor } from './link-media-editor'
vi.mock('@/lib/api',()=>({api:vi.fn()}))
vi.mock('./prepare-link-media',()=>({prepareLinkMediaFile:vi.fn(async()=> 'cGl4ZWxz')}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
it('explains a rejected attachment using the private review metadata',async()=>{
 vi.mocked(api).mockResolvedValue({status:200,body:{version:3,assets:[],reviews:[{kind:'IMAGE',reason:'Imagem inadequada'}]}})
 render(<LinkMediaEditor linkId="own"/> )
 expect((await screen.findByRole('status')).textContent).toContain('Imagem rejeitada: Imagem inadequada')
 expect(screen.queryByRole('img')).toBeNull()
})
it('preserves selected image on conflict and reloads the version before retry',async()=>{
 let conflict=true
 vi.mocked(api).mockImplementation(async(_path,init)=>init?.method==='PUT' ? {status:conflict?409:200,body:conflict?{message:'Os anexos mudaram.'}:{version:2}} : {status:200,body:{version:conflict?0:1,assets:[]}})
 render(<LinkMediaEditor linkId="own"/>)
 const choose=await screen.findByLabelText('Imagem do link (opcional)')
 fireEvent.change(choose,{target:{files:[new File(['pixels'],'a.png',{type:'image/png'})]}})
 await screen.findByRole('img')
 fireEvent.change(screen.getByLabelText('Descrição da imagem'),{target:{value:'Pessoas conversando'}})
 fireEvent.click(screen.getByRole('button',{name:'Enviar anexos para análise'}))
 await screen.findByRole('alert')
 expect(screen.getByRole('img')).toBeTruthy()
 conflict=false;fireEvent.click(screen.getByRole('button',{name:'Atualizar anexos'}))
 await waitFor(()=>expect((screen.getByRole('button',{name:'Enviar anexos para análise'}) as HTMLButtonElement).disabled).toBe(false))
 fireEvent.click(screen.getByRole('button',{name:'Enviar anexos para análise'}))
 await screen.findByText('Anexos enviados para análise.')
 const writes=vi.mocked(api).mock.calls.filter(([,init])=>init?.method==='PUT')
 expect(JSON.parse(writes.at(-1)![1]!.body as string).expectedVersion).toBe(1)
})
