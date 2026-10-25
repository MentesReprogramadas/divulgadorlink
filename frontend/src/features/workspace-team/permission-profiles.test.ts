import {describe,expect,it} from 'vitest'
import {iconPaths} from '@/components/ui/action-icon'
import {matchedPermissionProfile,permissionProfiles,profileGrants,permissionGroupIcon,type PermissionSection} from './permission-profiles'
const sections:PermissionSection[]=[
 {id:'page',label:'Página',group:'Conteúdo'},
 {id:'history',label:'Histórico',group:'Ferramentas'},
 {id:'reports',label:'Métricas',group:'Acompanhamento'},
 {id:'billing',label:'Pedidos',group:'Financeiro'},
 {id:'adminModeration',label:'Moderação',group:'Admin: operação'},
 {id:'adminBilling',label:'Assinaturas',group:'Admin: comercial'},
 {id:'adminSettings',label:'Configuração',group:'Admin: sistema'},
]
describe('perfis de acesso',()=>{
 it('administrator grants only sections provided by the server and never invents administrative access',()=>{
 const visible=sections.filter(row=>!row.id.startsWith('admin'))
 const grants=profileGrants(visible,'admin')
 expect(Object.keys(grants)).toEqual(visible.map(row=>row.id))
 expect(Object.values(grants).every(row=>row?.read&&row.write)).toBe(true)
 expect(grants.adminSettings).toBeUndefined()
 expect(permissionProfiles(visible).find(row=>row.id==='admin')).toMatchObject({label:'Gestor da conta',description:expect.stringContaining('Não concede administração do Tem Link Aqui')})
 expect(matchedPermissionProfile(visible,grants)?.label).toBe('Gestor da conta')
 expect(permissionProfiles(sections).find(row=>row.id==='admin')?.label).toBe('Administrador')
 })
 it('operator edits daily operations but excludes finance and system administration',()=>{
 const grants=profileGrants(sections,'operator')
 for(const id of ['page','history','reports'])expect(grants[id]).toEqual({read:true,write:true})
 for(const id of ['billing','adminModeration','adminBilling','adminSettings'])expect(grants[id]).toEqual({read:false,write:false})
 })
 it.each([['finance','billing'],['analyst','reports'],['editor','page']] as const)('%s restricts access to its stated area',(profile,id)=>{
 const grants=profileGrants(sections,profile)
 expect(Object.entries(grants).filter(([,row])=>row?.read).map(([id])=>id)).toEqual([id])
 expect(grants[id]?.write).toBe(profile!=='analyst')
 })
 it.each(['admin','operator','editor','analyst','finance','reader'])('reopening %s recognizes the full matrix without changing it',id=>{
 const grants=profileGrants(sections,id)
 expect(matchedPermissionProfile(sections,grants)?.id).toBe(id)
 })
 it('a mixed matrix remains custom and missing areas do not produce empty profiles',()=>{
 expect(matchedPermissionProfile(sections,{billing:{read:true,write:false}})).toBeUndefined()
 expect(permissionProfiles(sections.filter(row=>row.group!=='Financeiro')).some(row=>row.id==='finance')).toBe(false)
 })
 it('category and role drawings are exclusive across existing icons',()=>{
 const names=['workspaceAdmin','workspaceOperator',...new Set(sections.map(row=>permissionGroupIcon(row.group)).filter(row=>row!==undefined))] as const
 const drawings=names.map(name=>iconPaths[name])
 expect(new Set(drawings).size).toBe(drawings.length)
 for(const drawing of drawings)expect(Object.values(iconPaths).filter(other=>other===drawing)).toHaveLength(1)
 })
})
