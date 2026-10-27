'use client'

import Link from 'next/link'
import { useEffect, useId, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ActionIcon, type ActionIconName } from '@/components/ui/action-icon'
import { Field, Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import { navigationIcons, type NavigationDestination } from '@/components/layout/navigation-icons'
import { SidebarLink } from '@/components/layout/sidebar-link'
import { prepareWorkspaceSwitch } from '@/lib/workspace-switch-guards'
import styles from './workspace.module.css'
import {useWorkspaceAccess,workspaceVisible,hasWorkspaceAdmin,workspaceAdminPath} from '@/features/workspace-team/workspace-access'
import {useBillingAccess,routePaidFeature,paywallPath} from '@/features/profile-billing/billing-access'

type NavigationItem = { href: NavigationDestination; label: string }
type NavigationGroup = { label: string; items: NavigationItem[]; submenu?: { label: string; icon: ActionIconName; items: NavigationItem[] } }
type PanelContext = 'page' | 'links' | 'clients'
const contextLabels: Record<PanelContext, string> = {links:'Meus links',page:'Minha página',clients:'Outras páginas'}
const contextIcons: Record<PanelContext, ActionIconName> = {page:'profile',links:'catalogPublishing',clients:'clientRelations'}
const pageGroups: NavigationGroup[] = [
 {label:'',items:[{href:'/painel/perfil',label:'Visão geral'}]},
 {label:'',items:[],submenu:{label:'Editar página',icon:'pageEditing',items:[{href:'/painel/perfil/dados',label:'Apresentação'},{href:'/painel/perfil/links',label:'Grupos e botões'},{href:'/painel/perfil/conteudo',label:'Blocos de conteúdo'},{href:'/painel/perfil/aparencia',label:'Aparência'},{href:'/painel/perfil/idiomas',label:'Idiomas'},{href:'/painel/perfil/modelos',label:'Modelos'},{href:'/painel/perfil/endereco',label:'Endereço próprio'}]}},
 {label:'',items:[],submenu:{label:'Recursos da página',icon:'pageResources',items:[{href:'/painel/perfil/busca',label:'Busca e filtros'},{href:'/painel/perfil/formulario',label:'Formulário de contato'},{href:'/painel/perfil/descoberta',label:'Descoberta'}]}},
 {label:'',items:[],submenu:{label:'Resultados',icon:'pageResults',items:[{href:'/painel/perfil/metricas',label:'Visitas e cliques'},{href:'/painel/perfil/diagnostico',label:'Melhorias sugeridas'},{href:'/painel/perfil/testes',label:'Comparar botões'}]}},
 {label:'',items:[],submenu:{label:'Divulgar',icon:'pagePromotion',items:[{href:'/painel/perfil/campanhas',label:'Campanhas'},{href:'/painel/perfil/divulgar',label:'Criar imagem'},{href:'/painel/perfil/midia-kit',label:'Apresentação para parceiros'}]}},
 {label:'',items:[{href:'/painel/perfil/contatos',label:'Contatos recebidos'}]},
 {label:'',items:[],submenu:{label:'Ferramentas',icon:'pageTools',items:[{href:'/painel/perfil/checklist',label:'Revisar publicação'},{href:'/painel/perfil/historico',label:'Histórico de versões'},{href:'/painel/perfil/importar',label:'Importar links'},{href:'/painel/perfil/exportar',label:'Importar e exportar página'},{href:'/painel/integracoes',label:'Integrações e avisos'}]}},
]
const contextGroups: Record<PanelContext,NavigationGroup[]> = {
 page:pageGroups,
 links:[{label:'',items:[{href:'/painel',label:'Visão geral'},{href:'/painel/links',label:'Links no catálogo'},{href:'/painel/convites',label:'Links permanentes'},{href:'/painel/pedidos',label:'Pedidos e pagamentos'}]}],
 clients:[{label:'',items:[{href:'/painel/clientes',label:'Páginas que gerencio'},{href:'/painel/clientes/acessos',label:'Acessos por página'},{href:'/painel/clientes/transferencias',label:'Transferir página'}]}],
}
const accountGroups: NavigationGroup[] = [
 {label:'',items:[{href:'/painel/assinatura',label:'Planos e assinatura'}]},
 {label:'',items:[],submenu:{label:'Minha conta',icon:'accountTools',items:[{href:'/painel/conta',label:'Meus dados'},{href:'/painel/lembretes',label:'Lembretes'},{href:'/painel/favoritos',label:'Favoritos'},{href:'/painel/interesses',label:'Categorias seguidas'}]}},
 {label:'',items:[{href:'/painel/equipe',label:'Equipe e permissões'}]},
]
function groupItems(group:NavigationGroup){return [...group.items,...(group.submenu?.items??[])]}
function pathContext(path:string):PanelContext|null{
 if(path.startsWith('/painel/clientes'))return 'clients'
 if(path.startsWith('/painel/perfil')||/^\/painel\/equipe\/[^/]+\//.test(path)||path.startsWith('/painel/integracoes'))return 'page'
 if(path==='/painel'||path==='/painel/visao'||/^\/painel\/(links|convites|pedidos)(\/|$)/.test(path))return 'links'
 return null
}
function activeItem(path:string,item:NavigationItem){
 if(path==='/painel/visao')return item.href==='/painel'
 if(path.startsWith('/painel/perfil/canais'))return item.href==='/painel/perfil/links'
 return path===item.href||!['/painel','/painel/perfil','/painel/clientes','/painel/equipe'].includes(item.href)&&path.startsWith(item.href+'/')
}
function DisclosureArrow(){return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>}
const adminGroups: NavigationGroup[] = [
  { label: 'Operação', items: [{ href: '/admin/visao', label: 'Gestão' }], submenu: { label: 'Revisões', icon: 'reviews', items: [{ href: '/admin/moderacao', label: 'Moderação' }, { href: '/admin/denuncias', label: 'Denúncias' }, { href: '/admin/disponibilidade', label: 'Correções' }] } },
  { label: 'Comercial', items: [{href:'/admin/destaques',label:'Destaques de links'},{ href: '/admin/planos', label: 'Destaques' }, { href: '/admin/assinaturas', label: 'Planos de assinatura' }, { href: '/admin/estornos', label: 'Estornos' }] },
  { label: 'Sistema', items: [{ href: '/admin/integracoes', label: 'Integrações' }, { href: '/admin/configuracoes', label: 'Configurações' }] },
]
export function WorkspaceNavigationSkeleton({path,admin=false}:{path:string;admin?:boolean}){
 const groups=admin?adminGroups:contextGroups[pathContext(path)??'links']
 function rows(source:NavigationGroup[]){return source.map((group,index)=><div className={styles.navGroup} key={index}>{group.label?<p className={styles.groupLabel}><Skeleton width="45%" height={21}/></p>:null}{Array.from({length:group.submenu?1:group.items.length},(_,n)=><Skeleton key={n} height={48}/>)}{group.submenu?.items.some(item=>activeItem(path,item))?<div className={styles.subitems}>{group.submenu.items.map(item=><Skeleton key={item.href} height={48}/>)}</div>:null}</div>)}
 return <SkeletonRegion label="Carregando navegação"><div className={styles.navigation}>{!admin?<><div className={styles.contextShortcuts}><Skeleton height={48}/><Skeleton height={48}/></div><div className={styles.contextPicker}><Skeleton width="45%" height={18}/><Skeleton height={48}/></div></>:null}{rows(groups)}{!admin?<div className={styles.accountNavigation}>{rows(accountGroups)}<Skeleton height={48}/></div>:null}</div></SkeletonRegion>
}
export function WorkspaceNavigation({area,role}:{area:'panel'|'admin';role?:string}){
 const path=usePathname(),router=useRouter(),accordionId=useId(),access=useWorkspaceAccess()
 const billing=useBillingAccess()
 const [lastContext,setLastContext]=useState<PanelContext>('links'),[switching,setSwitching]=useState(false),[switchError,setSwitchError]=useState(''),[help,setHelp]=useState(false)
 useEffect(()=>{const detected=pathContext(path);if(detected)setLastContext(detected)},[path])
 const visibleItem=(item:NavigationItem)=>access.ready&&workspaceVisible(access.context,item.href)
 const available=(['links','page','clients'] as PanelContext[]).filter(context=>contextGroups[context].some(group=>groupItems(group).some(item=>item.href!=='/painel'&&visibleItem(item))))
 const requested=pathContext(path)??lastContext,context=available.includes(requested)?requested:available[0]??'links'
 async function changeContext(value:string){
  const next=available.find(key=>key===value)
  if(!next||next===context||switching)return
  const destination=contextGroups[next].flatMap(groupItems).find(visibleItem)?.href
  if(!destination)return
  setSwitching(true);setSwitchError('')
  try{await prepareWorkspaceSwitch();setLastContext(next);router.push(destination)}catch(reason){setSwitchError(reason instanceof Error?reason.message:'Não foi possível trocar de área. Seus dados foram mantidos.')}finally{setSwitching(false)}
 }
 function itemLink(item:NavigationItem){const feature=routePaidFeature(item.href),locked=Boolean(feature&&billing.state&&!billing.state.capabilities.includes(feature));return visibleItem(item)?<SidebarLink key={item.href} href={locked&&feature&&billing.canReadBilling?paywallPath(feature):item.href} active={activeItem(path,item)}><ActionIcon name={navigationIcons[item.href]} width={19} height={19} strokeWidth={1.6}/><span>{item.label}</span>{locked?<span className={styles.paidLock} title="Requer assinatura"><ActionIcon name="subscriptionLock" width={16} height={16}/><span className={styles.visuallyHidden}>Requer assinatura</span></span>:null}</SidebarLink>:null}
 function renderGroups(groups:NavigationGroup[]){return groups.filter(group=>groupItems(group).some(visibleItem)).map((group,index)=><div className={styles.navGroup} key={group.submenu?.label??group.label+index}>
  {group.label?<p className={styles.groupLabel}>{group.label}</p>:null}{group.items.map(itemLink)}
  {group.submenu?.items.some(visibleItem)?<details name={accordionId} data-navigation-group className={styles.submenu} open={group.submenu.items.some(item=>visibleItem(item)&&activeItem(path,item))} key={group.submenu.label+path}><summary><ActionIcon name={group.submenu.icon} width={19} height={19} strokeWidth={1.6}/><span>{group.submenu.label}</span><DisclosureArrow/></summary><div className={styles.subitems}>{group.submenu.items.map(itemLink)}</div></details>:null}
 </div>)}
 if(!access.ready)return <WorkspaceNavigationSkeleton path={path} admin={area==='admin'}/>
 return <nav className={styles.navigation} aria-label={area==='admin'?'Admin':'Áreas do painel'}>
  {(role==='ADMIN'&&!access.context?.ownerId||hasWorkspaceAdmin(access.context))?<div className={styles.areaLinks}><Link href="/painel" data-active={area==='panel'||undefined}>Meu painel</Link><Link href={access.context?.ownerId?workspaceAdminPath(access.context):'/admin/visao'} data-active={area==='admin'||undefined}>Administração</Link></div>:null}
  {area==='panel'?<>
   <div className={styles.contextShortcuts} role="group" aria-label="Atalhos do painel">{available.filter(key=>key!==context).map(key=><Button key={key} type="button" readOnlyAllowed variant="ghost" className={styles.helpButton} disabled={switching} onClick={()=>void changeContext(key)}><ActionIcon name={contextIcons[key]}/>{contextLabels[key]}</Button>)}</div>
   <div className={styles.contextPicker}><Field label="Área do painel"><Select value={context} disabled={switching||!available.length} optionIcons={Object.fromEntries(available.map(key=>[key,<ActionIcon key={key} name={contextIcons[key]}/>]))} onChange={event=>void changeContext(event.target.value)}>{available.map(key=><option key={key} value={key}>{contextLabels[key]}</option>)}</Select></Field>{switchError?<p className={styles.navigationError} role="alert">{switchError}</p>:null}</div>
   <div className={styles.contextNavigation}>{renderGroups(contextGroups[context])}</div>
   <div className={styles.accountNavigation}>{renderGroups(accountGroups)}<Button readOnlyAllowed variant="ghost" className={styles.helpButton} onClick={()=>setHelp(true)}><ActionIcon name="navigationHelp"/>Ajuda</Button></div>
   <OverlayDialog open={help} title="Como usar o painel" onClose={()=>setHelp(false)}><div className={styles.helpContent}><p><strong>Minha página:</strong> personalize sua página, publique e acompanhe os resultados.</p><p><strong>Meus links:</strong> publique no catálogo ou crie um link permanente. O endereço compartilhado fica igual quando você altera o destino.</p><p><strong>Outras páginas:</strong> gerencie páginas de outras pessoas que deram acesso a você.</p><p>Troque a área pelos atalhos ou pelo seletor no topo do menu. Conta e equipe continuam acessíveis no final da navegação.</p></div></OverlayDialog>
  </>:renderGroups(adminGroups)}
 </nav>
}
