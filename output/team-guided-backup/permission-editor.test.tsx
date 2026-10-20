import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {PermissionEditor} from './permission-editor'
import {workspaceVisible,workspaceSection} from './workspace-access'
afterEach(cleanup)
const sections=[{id:'page',label:'Minha página',group:'Conteúdo'},{id:'links',label:'Links',group:'Conteúdo'}]
it('writing checks and locks reading; removing write preserves reading',()=>{
 const change=vi.fn(),{rerender}=render(<PermissionEditor sections={sections} grants={{}} onChange={change}/>);
 fireEvent.click(screen.getByLabelText('Escrever Minha página'));expect(change).toHaveBeenLastCalledWith({page:{read:true,write:true}})
 rerender(<PermissionEditor sections={sections} grants={{page:{read:true,write:true}}} onChange={change}/>);expect((screen.getByLabelText('Ler Minha página') as HTMLInputElement).disabled).toBe(true)
 fireEvent.click(screen.getByLabelText('Escrever Minha página'));expect(change).toHaveBeenLastCalledWith({page:{read:true,write:false}})
})
it('bulk controls apply only registered sections and blocked menus disappear',()=>{
 const change=vi.fn();render(<PermissionEditor sections={sections} grants={{}} onChange={change}/>);fireEvent.click(screen.getByRole('button',{name:'Acesso completo'}));expect(change).toHaveBeenLastCalledWith({page:{read:true,write:true},links:{read:true,write:true}})
 const context={ownerId:'owner',grants:{page:{read:true,write:false}}};expect(workspaceVisible(context,'/painel/perfil')).toBe(true);expect(workspaceVisible(context,'/painel/perfil/campanhas')).toBe(false);expect(workspaceVisible(context,'/painel/equipe')).toBe(false);expect(workspaceSection('/painel/perfil/campanhas/a/metricas')).toBe('reports')
})
