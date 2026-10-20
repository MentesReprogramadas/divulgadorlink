import {ButtonLink} from '@/components/ui/button'
import {ActionIcon,type ActionIconName} from '@/components/ui/action-icon'
import type {WorkspaceContext} from './workspace-access'
import styles from './workspace-team.module.css'
const destinations:Array<{section:string;href:string;label:string;icon:ActionIconName}>=[
 {section:'adminHighlights',href:'/admin/destaques',label:'Destaques administrativos',icon:'promotion'},
 {section:'adminManagement',href:'/admin/visao',label:'Gestão do sistema',icon:'management'},
 {section:'adminModeration',href:'/admin/moderacao',label:'Moderação',icon:'shield'},
 {section:'adminReports',href:'/admin/denuncias',label:'Denúncias',icon:'report'},
 {section:'adminAvailability',href:'/admin/disponibilidade',label:'Correções',icon:'repair'},
 {section:'adminBilling',href:'/admin/assinaturas',label:'Assinaturas',icon:'billingAdmin'},
 {section:'adminRefunds',href:'/admin/estornos',label:'Estornos',icon:'refund'},
 {section:'adminIntegrations',href:'/admin/integracoes',label:'Integrações',icon:'integration'},
 {section:'adminSettings',href:'/admin/configuracoes',label:'Configurações',icon:'settings'},
 {section:'links',href:'/painel/links',label:'Links do catálogo',icon:'link'},
 {section:'contacts',href:'/painel/perfil/contatos',label:'Contatos recebidos',icon:'contactInbox'},
 {section:'page',href:'/painel/perfil',label:'Minha página',icon:'profile'},
 {section:'campaigns',href:'/painel/perfil/campanhas',label:'Campanhas',icon:'campaignPages'},
 {section:'presentation',href:'/painel/perfil/midia-kit',label:'Apresentação para parceiros',icon:'mediaKit'},
 {section:'invitations',href:'/painel/convites',label:'Convites',icon:'invite'},
 {section:'reports',href:'/painel/perfil/metricas',label:'Métricas',icon:'interaction'},
 {section:'assistant',href:'/painel/perfil/assistente',label:'Assistente da página',icon:'profileAssistant'},
 {section:'history',href:'/painel/perfil/historico',label:'Histórico',icon:'history'},
 {section:'transfer',href:'/painel/perfil/exportar',label:'Importar e exportar',icon:'download'},
 {section:'favorites',href:'/painel/favoritos',label:'Favoritos',icon:'star'},
 {section:'interests',href:'/painel/interesses',label:'Categorias seguidas',icon:'followNiche'},
 {section:'reminders',href:'/painel/lembretes',label:'Lembretes',icon:'bell'},
 {section:'billing',href:'/painel/pedidos',label:'Pedidos e assinatura',icon:'orders'},
]
export function WorkspaceHome({context}:{context:WorkspaceContext}){const visible=destinations.filter(row=>context.grants?.[row.section]?.read);return <div className={styles.grid}>{visible.map(row=><article className={styles.card} key={row.section}><h2>{row.label}</h2><span className={styles.badge}>{context.grants?.[row.section]?.write?'Leitura e escrita':'Somente leitura'}</span><ButtonLink href={row.href}><ActionIcon name={row.icon}/>Abrir {row.label.toLocaleLowerCase('pt-BR')}</ButtonLink></article>)}{!visible.length?<p>Nenhuma seção foi liberada. Peça acesso ao proprietário.</p>:null}</div>}
