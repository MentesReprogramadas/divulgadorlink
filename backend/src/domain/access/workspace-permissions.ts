import {z} from 'zod'

export const permissionSections=[

 {id:'links',label:'Links do catálogo',group:'Conteúdo'},

 {id:'contacts',label:'Contatos recebidos e formulário',group:'Conteúdo'},

 {id:'page',label:'Minha página',group:'Conteúdo'},

 {id:'campaigns',label:'Campanhas',group:'Conteúdo'},

 {id:'presentation',label:'Apresentação para parceiros',group:'Conteúdo'},

 {id:'invitations',label:'Convites permanentes',group:'Conteúdo'},

 {id:'assistant',label:'Assistente: ler e alterar o rascunho',group:'Ferramentas'},

 {id:'history',label:'Histórico de publicações',group:'Ferramentas'},

 {id:'transfer',label:'Importação e exportação',group:'Ferramentas'},

 {id:'reports',label:'Métricas e resultados',group:'Acompanhamento'},

 {id:'favorites',label:'Favoritos e coleções',group:'Acompanhamento'},

 {id:'interests',label:'Categorias e resumos',group:'Acompanhamento'},

 {id:'reminders',label:'Lembretes',group:'Acompanhamento'},

 {id:'billing',label:'Pedidos e assinatura',group:'Financeiro'},

 {id:'adminManagement',label:'Gestão e relatórios do sistema',group:'Admin: operação'},

 {id:'adminModeration',label:'Moderação de conteúdo',group:'Admin: operação'},

 {id:'adminReports',label:'Denúncias',group:'Admin: operação'},

 {id:'adminAvailability',label:'Correções de links',group:'Admin: operação'},

 {id:'adminHighlights',label:'Destaques administrativos',group:'Admin: comercial'},

 {id:'adminBilling',label:'Assinaturas de páginas',group:'Admin: comercial'},

 {id:'adminRefunds',label:'Estornos',group:'Admin: comercial'},

 {id:'adminIntegrations',label:'Integrações e avisos',group:'Admin: sistema'},

 {id:'adminSettings',label:'Configurações e categorias',group:'Admin: sistema'},

] as const

export type WorkspaceSection=typeof permissionSections[number]['id']

export type WorkspaceGrants=Partial<Record<WorkspaceSection,{read:boolean;write:boolean}>>

const level=z.object({read:z.boolean(),write:z.boolean()}).strict().refine(row=>!row.write||row.read,'Escrever exige Ler.')

export const workspaceGrants=z.object(Object.fromEntries(permissionSections.map(section=>[section.id,level.optional()])) as Record<WorkspaceSection,z.ZodOptional<typeof level>>).strict()

export function canWorkspace(grants:WorkspaceGrants,section:WorkspaceSection,write=false){return grants[section]?.read===true&&(!write||grants[section]?.write===true)}

export function publicWorkspaceAction(method:string,path:string){

 if(method==='GET')return /^\/links\/(?!mine$|submission-started$)[^/]+\/?$/.test(path)

 return method==='POST'&&(/^\/profiles\/[a-z0-9-]+\/contact-form\/submissions$/.test(path)||/^\/analytics\/(consent|visits|impressions)$/.test(path)||/^\/analytics\/profiles\/(events|campaigns\/[^/]+\/events)$/.test(path)||/^\/links\/[^/]+\/reports$/.test(path)||path==='/age')

}

/** Explicit registration: new private endpoints are denied until classified. */

export function workspaceRoute(path:string):WorkspaceSection|null{

 if(/^\/admin\/(office|finance|retention|traffic|search-opportunities)(\/|$)/.test(path)||/^\/admin\/users\/[^/]+\/ban$/.test(path)||/^\/admin\/links\/[^/]+\/withdraw$/.test(path))return 'adminManagement'

 if(/^\/admin\/(moderation|content-reviews)(\/|$)/.test(path))return 'adminModeration'

 if(/^\/admin\/reports(\/|$)/.test(path))return 'adminReports'

 if(/^\/admin\/url-proposals(\/|$)/.test(path))return 'adminAvailability'

 if(/^\/admin\/links\/[^/]+\/promotions$/.test(path))return 'adminHighlights'

 if(/^\/admin\/profile-billing(\/|$)/.test(path))return 'adminBilling'

 if(/^\/admin\/refunds(\/|$)/.test(path))return 'adminRefunds'

 if(/^\/admin\/integrations(\/|$)/.test(path))return 'adminIntegrations'

 if(/^\/admin\/(config|settings|facets)(\/|$)/.test(path))return 'adminSettings'

 if(/^\/me\/profile\/suggestions(?:\/|$)/.test(path))return 'assistant'

 if(/^\/me\/forms(?:\/|$)/.test(path))return 'contacts'

 if(/^\/me\/profile\/(team|members|invitations)(\/|$)/.test(path))return null

 if(/^\/me\/profile\/campaign-sources(?:\/[^/]+)?$/.test(path))return 'campaigns'

 if(/^\/me\/profile\/campaigns(\/|$)/.test(path))return path.endsWith('/interaction')?'reports':'campaigns'

 if(/^\/me\/profile\/media-kit(\/|$)/.test(path))return 'presentation'

 if(/^\/me\/profile\/(backup|import|export)(\/|$|\?)/.test(path))return 'transfer'

 if(/^\/me\/profile\/revisions(\/|$)/.test(path))return 'history'

 if(/^\/me\/profile\/(interaction|measurement)(\/|$)/.test(path))return 'reports'

 if(/^\/me\/profile(?:\/(hosts(?:\/verify)?|preview(?:\/items)?|catalog|channel-groups(?:\/[^/]+)?|channel-destinations(?:\/[^/]+)?|avatar(?:\/[^/]+)?|publish|unpublish|discard|apply-template|checklist(?:\/actions)?))?$/.test(path))return 'page'

 if(/^\/me\/redirects(\/|$)/.test(path))return 'invitations'

 if(/^\/me\/(favorites|collections)(\/|$)/.test(path))return 'favorites'

 if(/^\/me\/(followed-niches|niche-digest-preferences)(\/|$)/.test(path))return 'interests'

 if(path==='/me/notification-preferences'||path==='/promotions/mine/reminders')return 'reminders'

 if(/^\/(me\/(subscription|billing-operations)|orders|promotions\/(mine|checkout|renew)|subscriptions\/checkout)(\/|$)/.test(path))return 'billing'

 if(/^\/analytics\/links\/[^/]+(?:\/performance)?$/.test(path)||/^\/links\/[^/]+\/performance/.test(path))return 'reports'

 if(/^\/links(?:\/mine|\/submission-started|\/[^/]+(?:\/(availability|url-proposals|appeal|discovery))?)?\/?$/.test(path))return 'links'

 return null

}
