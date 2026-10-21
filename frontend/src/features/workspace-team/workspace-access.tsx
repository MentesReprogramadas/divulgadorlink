'use client'
import {useEffect,useState,createContext,useContext} from 'react'
import {prepareWorkspaceSwitch} from '@/lib/workspace-switch-guards'
import {api,bindApiWorkspace} from '@/lib/api'
import {Button} from '@/components/ui/button'
import styles from './workspace-team.module.css'
import {ActionIcon} from '@/components/ui/action-icon'
export type Grants=Record<string,{read:boolean;write:boolean}|undefined>
export type WorkspaceContext={ownerId:string|null;name?:string;grants:Grants|null}
export const WorkspaceIdentity=createContext<WorkspaceContext|null>(null)
export function useWorkspaceIdentity(){return useContext(WorkspaceIdentity)}
const adminRoutes:Record<string,string>={'/admin/destaques':'adminHighlights','/admin/visao':'adminManagement','/admin/moderacao':'adminModeration','/admin/denuncias':'adminReports','/admin/disponibilidade':'adminAvailability','/admin/planos':'adminSettings','/admin/assinaturas':'adminBilling','/admin/estornos':'adminRefunds','/admin/integracoes':'adminIntegrations','/admin/configuracoes':'adminSettings'}
export function workspaceSection(path:string){
 if(path.startsWith('/painel/clientes/transferencias'))return 'personal'
 if(path.startsWith('/painel/clientes'))return 'agency'
 if(path.startsWith('/painel/integracoes'))return 'integrations'
 if(adminRoutes[path])return adminRoutes[path]
 if(path.startsWith('/admin')||path.startsWith('/painel/conta')||path.startsWith('/painel/equipe'))return 'personal'
 if(path.startsWith('/painel/perfil/assistente'))return 'assistant'
 if(path.startsWith('/painel/perfil/contatos'))return 'contacts'
 if(path.startsWith('/painel/perfil/campanhas'))return path.endsWith('/metricas')?'reports':'campaigns'
 if(path.startsWith('/painel/perfil/midia-kit'))return 'presentation'
 if(path.startsWith('/painel/perfil/importar')||path.startsWith('/painel/perfil/exportar'))return 'transfer'
 if(path.startsWith('/painel/perfil/historico'))return 'history'
 if(path.startsWith('/painel/perfil/metricas')||path.endsWith('/resultado'))return 'reports'
 if(path.startsWith('/painel/perfil'))return 'page'
 if(path.startsWith('/painel/links'))return 'links'
 if(path.startsWith('/painel/convites'))return 'invitations'
 if(path.startsWith('/painel/favoritos'))return 'favorites'
 if(path.startsWith('/painel/interesses'))return 'interests'
 if(path.startsWith('/painel/lembretes'))return 'reminders'
 if(path.startsWith('/painel/pedidos')||path.startsWith('/painel/assinatura'))return 'billing'
 return 'overview'
}
export function workspaceAdminPath(context:WorkspaceContext|null){return Object.entries(adminRoutes).find(([,section])=>context?.grants?.[section]?.read)?.[0]??'/admin/visao'}
export function hasWorkspaceAdmin(context:WorkspaceContext|null){return Boolean(context?.ownerId&&Object.entries(context.grants??{}).some(([key,value])=>key.startsWith('admin')&&value?.read))}
export function workspaceVisible(context:WorkspaceContext|null,path:string){if(!context?.ownerId)return true;const section=workspaceSection(path);if(/\/(?:novo|editar|destaque|contestar|importar|aparencia|dados)$/.test(path)||path==='/painel/perfil/links')return context.grants?.[section]?.write===true;return section==='overview'||context.grants?.[section]?.read===true}
export function useWorkspaceAccess(enabled=true){
 const [context,setContext]=useState<WorkspaceContext|null>(null),[ready,setReady]=useState(false),[error,setError]=useState('')
 useEffect(()=>{if(!enabled)return;let cancelled=false;function load(){api<WorkspaceContext&{message?:string}>('/v1/team/context').then(response=>{if(cancelled)return;if(response.status!==200){setError(response.body.message??'Não foi possível conferir seu acesso.');setReady(false);return}setError('');bindApiWorkspace(response.body.ownerId);setContext(response.body);setReady(true)}).catch(()=>{if(!cancelled)setError('Sem conexão para conferir seu acesso.')})}load();window.addEventListener('focus',load);window.addEventListener('workspace-access-changed',load);return()=>{cancelled=true;window.removeEventListener('focus',load);window.removeEventListener('workspace-access-changed',load)}},[enabled])

 return {context,ready,error}
}
export async function selectWorkspace(ownerId:string|null,destination?:string){if(destination&&(ownerId!==null||destination!=='/painel/clientes/transferencias'&&!/^\/painel\/equipe\/[a-f0-9-]{36}\/(editar|metricas)$/.test(destination)))throw new Error('Destino do espaço inválido.');await prepareWorkspaceSwitch();const response=await api<{message?:string}>('/v1/team/select',{method:'POST',body:JSON.stringify({ownerId})});if(response.status!==200)throw new Error(response.body.message??'Não foi possível abrir o espaço.');window.location.assign(destination??(ownerId?'/painel':'/painel/equipe'))}
export function WorkspaceBanner({context}:{context:WorkspaceContext}){const [error,setError]=useState('');return <div role="region" aria-label="Espaço compartilhado" className={styles.workspaceBanner}><strong>Espaço de {context.name}</strong><Button variant="secondary" onClick={()=>void selectWorkspace(null).catch(reason=>setError(reason.message))}><ActionIcon name="back"/>Voltar ao meu espaço</Button>{error?<p role="alert">{error}</p>:null}</div>}
