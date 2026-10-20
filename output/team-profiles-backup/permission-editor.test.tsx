import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {PermissionEditor,PermissionSummary} from './permission-editor'
import {workspaceVisible,workspaceSection} from './workspace-access'
afterEach(cleanup)
const sections=[{id:'page',label:'Minha página',group:'Conteúdo'},{id:'links',label:'Links',group:'Conteúdo'}]
it('writing checks and locks reading; removing write preserves reading',()=>{
 const change=vi.fn(),{rerender}=render(<PermissionEditor sections={sections} grants={{}} onChange={change}/>);
 fireEvent.click(screen.getByRole('radio',{name:/Personalizado/}));fireEvent.click(screen.getByLabelText('Escrever Minha página'));expect(change).toHaveBeenLastCalledWith({page:{read:true,write:true}})
 rerender(<PermissionEditor sections={sections} grants={{page:{read:true,write:true}}} onChange={change}/>);expect((screen.getByLabelText('Ler Minha página') as HTMLInputElement).disabled).toBe(true)
 fireEvent.click(screen.getByLabelText('Escrever Minha página'));expect(change).toHaveBeenLastCalledWith({page:{read:true,write:false}})
})
it('bulk controls apply only registered sections and blocked menus disappear',()=>{
 const change=vi.fn();render(<PermissionEditor sections={sections} grants={{}} onChange={change}/>);fireEvent.click(screen.getByRole('radio',{name:/Editor de conteúdo/}));expect(change).toHaveBeenLastCalledWith({page:{read:true,write:true},links:{read:true,write:true}})
 const context={ownerId:'owner',grants:{page:{read:true,write:false}}};expect(workspaceVisible(context,'/painel/perfil')).toBe(true);expect(workspaceVisible(context,'/painel/perfil/campanhas')).toBe(false);expect(workspaceVisible(context,'/painel/equipe')).toBe(false);expect(workspaceSection('/painel/perfil/campanhas/a/metricas')).toBe('reports')
})

it('preserves custom grants when opening advanced mode and changes only the chosen category',()=>{
 const change=vi.fn(),all=[...sections,{id:'billing',label:'Pedidos',group:'Financeiro'}],grants={billing:{read:true,write:false}}
 render(<PermissionEditor sections={all} grants={grants} onChange={change}/>)
 expect((screen.getByRole('radio',{name:/Personalizado/}) as HTMLInputElement).checked).toBe(true)
 expect(change).not.toHaveBeenCalled()
 fireEvent.click(screen.getByText('Financeiro',{selector:'summary span'}))
 fireEvent.click(screen.getAllByRole('button',{name:'Editar categoria'})[1])
 expect(change).toHaveBeenLastCalledWith({billing:{read:true,write:true}})
})
it('content profiles exclude finance and administration and summary lists every granted section',()=>{
 const change=vi.fn(),all=[...sections,{id:'billing',label:'Pedidos',group:'Financeiro'},{id:'adminSettings',label:'Configurações',group:'Admin: sistema'}]
 const {unmount}=render(<PermissionEditor sections={all} grants={{billing:{read:true,write:true}}} onChange={change}/>)
 fireEvent.click(screen.getByRole('radio',{name:/Leitor de conteúdo/}))
 expect(change).toHaveBeenLastCalledWith({page:{read:true,write:false},links:{read:true,write:false},billing:{read:false,write:false},adminSettings:{read:false,write:false}})
 unmount()
 render(<PermissionSummary sections={all} grants={{billing:{read:true,write:true},page:{read:true,write:false}}}/>)
 expect(screen.getByRole('region',{name:'Resumo das permissões'}).textContent).toContain('2 de 4 seções com acesso')
 expect(screen.getByText('Só visualizar')).toBeTruthy()
 expect(screen.getByText('Ver e editar')).toBeTruthy()
})

