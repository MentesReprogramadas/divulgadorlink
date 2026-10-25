import type {ActionIconName} from '@/components/ui/action-icon'
import type {Grants} from './workspace-access'
export type PermissionSection={id:string;label:string;group:string}
type PermissionProfile={id:string;label:string;description:string;icon:ActionIconName;readGroups:readonly string[]|'all';writeGroups:readonly string[]|'all'}
const profiles:PermissionProfile[]=[
 {id:'admin',label:'Administrador',description:'Acesso completo às áreas disponíveis, incluindo financeiro e administração quando habilitada.',icon:'workspaceAdmin',readGroups:'all',writeGroups:'all'},
 {id:'operator',label:'Operador',description:'Cuida do dia a dia: conteúdo, ferramentas e acompanhamento. Sem financeiro ou administração.',icon:'workspaceOperator',readGroups:['Conteúdo','Ferramentas','Acompanhamento'],writeGroups:['Conteúdo','Ferramentas','Acompanhamento']},
 {id:'editor',label:'Editor de conteúdo',description:'Edita página, links, campanhas e demais seções de Conteúdo.',icon:'edit',readGroups:['Conteúdo'],writeGroups:['Conteúdo']},
 {id:'analyst',label:'Analista',description:'Consulta métricas, favoritos, categorias e lembretes. Sem fazer alterações.',icon:'permissionTracking',readGroups:['Acompanhamento'],writeGroups:[]},
 {id:'finance',label:'Financeiro',description:'Gerencia pedidos e assinatura. Sem acesso às demais áreas.',icon:'permissionFinance',readGroups:['Financeiro'],writeGroups:['Financeiro']},
 {id:'reader',label:'Leitor',description:'Visualiza conteúdo, ferramentas, acompanhamento e financeiro. Não edita nem acessa a administração.',icon:'eye',readGroups:['Conteúdo','Ferramentas','Acompanhamento','Financeiro'],writeGroups:[]},
]
export function permissionProfiles(sections:PermissionSection[]){return profiles.filter(profile=>sections.some(row=>profile.readGroups==='all'||profile.readGroups.includes(row.group))).map(profile=>profile.id==='admin'&&!sections.some(row=>row.id.startsWith('admin'))?{...profile,label:'Gestor da conta',description:'Acesso completo às áreas desta conta. Não concede administração do Tem Link Aqui.'}:profile)}
export function profileGrants(sections:PermissionSection[],id:string):Grants{
 const profile=profiles.find(row=>row.id===id)
 if(!profile)return {}
 return Object.fromEntries(sections.map(row=>[row.id,{read:profile.readGroups==='all'||profile.readGroups.includes(row.group),write:profile.writeGroups==='all'||profile.writeGroups.includes(row.group)}]))
}
export function matchedPermissionProfile(sections:PermissionSection[],grants:Grants){
 const available=permissionProfiles(sections)
 return [...available.filter(row=>row.id!=='admin'),...available.filter(row=>row.id==='admin')].find(profile=>{
 const expected=profileGrants(sections,profile.id)
 return sections.every(row=>Boolean(grants[row.id]?.read)===expected[row.id]?.read&&Boolean(grants[row.id]?.write)===expected[row.id]?.write)
 })
}
export function permissionProfile(sections:PermissionSection[],grants:Grants){return matchedPermissionProfile(sections,grants)?.label??'Personalizado'}
export function permissionGroupIcon(group:string):ActionIconName|undefined{
 const icons:Record<string,ActionIconName>={'Conteúdo':'permissionContent','Ferramentas':'permissionTools','Acompanhamento':'permissionTracking','Financeiro':'permissionFinance','Admin: operação':'permissionAdminOperations','Admin: comercial':'permissionAdminCommercial','Admin: sistema':'permissionAdminSystem'}
 return icons[group]
}
