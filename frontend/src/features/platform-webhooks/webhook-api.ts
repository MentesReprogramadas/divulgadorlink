import {api} from '@/lib/api'
export const eventLabels={'contact.received':'Contato recebido','link.approved':'Link aprovado','campaign.ended':'Campanha encerrada','integration.test':'Teste de integração'} as const
export type WebhookType=Exclude<keyof typeof eventLabels,'integration.test'>
export type WebhookEndpoint={id:string;url:string;eventTypes:WebhookType[];enabled:boolean;version:number}
export type WebhookState={configured:boolean;endpoints:WebhookEndpoint[];deliveries:Array<{id:string;eventId:string;endpointId:string;type:keyof typeof eventLabels;status:string;attempts:number;budget:number;createdAt:string;nextAttemptAt:string;statusCode:number|null;errorCode:string|null}>}
export async function webhookRequest<T>(path='',init?:RequestInit):Promise<T>{const response=await api<T&{message?:string}>('/v1/me/integrations/'+path,init).catch(()=>{throw new Error('Sem conexão. Seus dados foram mantidos.')});if(response.status!==200)throw new Error(response.body.message??'Não foi possível atualizar a integração.');return response.body}
