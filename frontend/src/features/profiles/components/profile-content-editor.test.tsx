import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {ProfileContentEditor} from './profile-content-editor'
import {ProfileView} from './profile-view'
import {emptyProfile} from '../profile-contract'
const {prepareImage}=vi.hoisted(()=>({prepareImage:vi.fn()}))
vi.mock('../prepare-avatar',()=>({prepareAvatar:prepareImage}))
afterEach(cleanup)
it('upload de imagem compartilha o seletor e preserva validação, espera e asset salvo',async()=>{
 const onChange=vi.fn(),onUpload=vi.fn(),content={...emptyProfile(),contentBlocks:[{id:'image',type:'IMAGE' as const,title:'Capa',assetId:'old-asset',alt:'Livros da comunidade',caption:'Nosso acervo',visible:true}]}
 render(<ProfileContentEditor content={content} allowed pending={false} onChange={onChange} onUpload={onUpload}/>)
 fireEvent.click(screen.getByRole('button',{name:'Editar Capa'}))
 expect(screen.getByText('Escolher imagem')).toBeTruthy()
 const input=screen.getByLabelText('Imagem') as HTMLInputElement
 expect(input.accept).toBe('image/png,image/jpeg,image/webp')
 prepareImage.mockRejectedValueOnce(new Error('Escolha uma foto PNG, JPG ou WebP de até 5 MB.'))
 fireEvent.change(input,{target:{files:[new File(['invalid'],'foto.gif',{type:'image/gif'})]}})
 await screen.findByRole('alert')
 expect(onUpload).not.toHaveBeenCalled()
 let finish!:(asset:string)=>void
 prepareImage.mockResolvedValueOnce('normalized-webp')
 onUpload.mockReturnValueOnce(new Promise<string>(resolve=>{finish=resolve}))
 fireEvent.change(input,{target:{files:[new File(['valid'],'foto.png',{type:'image/png'})]}})
 await waitFor(()=>expect(onUpload).toHaveBeenCalledWith('normalized-webp'))
 expect(input.disabled).toBe(true)
 expect((screen.getByRole('button',{name:'Fechar janela'}) as HTMLButtonElement).disabled).toBe(true)
 await act(async()=>finish('new-asset'))
 fireEvent.click(screen.getByRole('button',{name:'Salvar bloco'}))
 expect(onChange).toHaveBeenCalledWith({...content,contentBlocks:[{...content.contentBlocks[0],assetId:'new-asset'}]})
})
it('nomes acessíveis de ordenação preservam o rótulo visível e identificam o bloco',()=>{
 render(<ProfileContentEditor content={{...emptyProfile(),contentBlocks:[{id:'one',type:'TEXT',title:'Sobre a comunidade',body:'Estudos e encontros.',visible:true},{id:'two',type:'TEXT',title:'Nossos encontros',body:'Agenda semanal.',visible:true}]}} allowed pending={false} onChange={vi.fn()} onUpload={vi.fn()}/> )
 expect(screen.getByRole('button',{name:'Subir Nossos encontros'}).textContent).toContain('Subir')
 expect(screen.getByRole('button',{name:'Descer Sobre a comunidade'}).textContent).toContain('Descer')
})
it('valida vídeo e salva conteúdo explícito sem alterar aparência ou links gratuitos',()=>{
 const onChange=vi.fn(),content=emptyProfile()
 render(<ProfileContentEditor content={content} allowed pending={false} onChange={onChange} onUpload={vi.fn()}/>)
 fireEvent.click(screen.getByRole('button',{name:'Adicionar bloco'}));fireEvent.change(screen.getByLabelText('Título'),{target:{value:'Meus serviços'}});fireEvent.change(screen.getByLabelText('Texto'),{target:{value:'Consultoria e atendimento'}});fireEvent.click(screen.getByRole('button',{name:'Salvar bloco'}))
 expect(onChange).toHaveBeenCalledWith({...content,contentBlocks:[expect.objectContaining({type:'TEXT',title:'Meus serviços',body:'Consultoria e atendimento',visible:true})]})
})
it('publicação não inicia vídeo antes da escolha do visitante e oculta blocos privados',()=>{
 const {container}=render(<ProfileView content={{...emptyProfile(),contentBlocks:[{id:'v',type:'VIDEO',title:'Minha história',url:'https://youtu.be/dQw4w9WgXcQ',visible:true},{id:'t',type:'TEXT',title:'Sentinela privada',body:'Privado',visible:false}]}}/>)
 expect(container.querySelector('iframe')).toBeNull();expect(screen.queryByText('Sentinela privada')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'Carregar vídeo'}));expect(container.querySelector('iframe')?.src).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
})
