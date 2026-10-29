import { z } from 'zod'
import { AffiliateError, groupJid, imageUrl, validInvite } from '@/domain/affiliates/contracts'
import type { AffiliateInviteReadCache } from './invite-read-cache'

export class AffiliateProviderError extends AffiliateError {
  constructor(public readonly uncertain: boolean, public readonly providerStatus?: number) {
    super(503, uncertain ? 'Resposta incerta do WhatsApp. Confira no grupo antes de repetir.' : 'Não foi possível acessar o WhatsApp. Confira a conexão e as permissões da instância.')
  }
}
const remoteGroup = z.object({
  id: groupJid, subject: z.string().min(1).max(200), size: z.number().int().nonnegative().optional(),
  participants: z.array(z.unknown()).optional(), desc: z.string().optional().nullable(), pictureUrl: imageUrl,
}).refine(row => row.size !== undefined || row.participants !== undefined)
export type WhatsAppGroup = { jid:string; name:string; participantCount:number; description:string; imageUrl:string|null }
export interface AffiliateWhatsApp {
  status?(options?:{fresh:true}):Promise<{state:string}>
  group(jid:string):Promise<WhatsAppGroup>
  groups():Promise<WhatsAppGroup[]>
  invite(jid:string):Promise<string>
  create(name:string,description:string):Promise<string>
  picture(jid:string,url:string):Promise<void>
  avatar?(jid:string):Promise<string|null>
  describe(jid:string,description:string):Promise<void>
  send(jid:string,message:string,imageUrl:string|null):Promise<string>
}
function parseGroup(value: unknown):WhatsAppGroup {
  const row = remoteGroup.safeParse(value)
  if (!row.success) throw new AffiliateProviderError(false)
  return {jid:row.data.id,name:row.data.subject,participantCount:row.data.size ?? row.data.participants!.length,description:row.data.desc ?? '',imageUrl:row.data.pictureUrl ?? null}
}
export class AffiliateEvolution implements AffiliateWhatsApp {
  constructor(private readonly config:{baseUrl:string;apiKey:string;instance:string;ownerPhone?:string|null}, private readonly transport:typeof fetch = fetch, private readonly inviteCache?:AffiliateInviteReadCache) {}
  private async request(path:string,body?:unknown,uncertain=false):Promise<unknown> {
    if (!this.config.apiKey || !this.config.baseUrl) throw new AffiliateError(503,'Configure o servidor Evolution para afiliados.')
    const base = new URL(this.config.baseUrl)
    if ((base.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && base.protocol === 'http:' && ['127.0.0.1','localhost'].includes(base.hostname))) || base.username || base.password || base.search || base.hash) throw new AffiliateError(503,'Servidor Evolution inválido.')
    let response: Response
    try {
      response = await this.transport(new URL(path,base), {method:body === undefined ? 'GET':'POST',headers:{apikey:this.config.apiKey,...(body === undefined ? {}:{'content-type':'application/json'})},...(body === undefined ? {}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15_000),redirect:'error',cache:'no-store'})
    } catch { throw new AffiliateProviderError(uncertain) }
    if (!response.ok) {
      if (response.body) await response.body.cancel().catch(() => undefined)
      // Evolution can return 400 after WhatsApp accepted a send but persistence/events failed.
      const rejectedBeforeAction = [401,403,404,405,409,413,415,422,429].includes(response.status)
      throw new AffiliateProviderError(uncertain && !rejectedBeforeAction,response.status)
    }
    try {
      if (!response.body) throw new Error('empty body')
      const reader = response.body.getReader(), chunks:Uint8Array[] = []
      let size = 0
      try {
        for (;;) {
          const {done,value} = await reader.read()
          if (done) break
          size += value.byteLength
          if (size > 2_000_000) {await reader.cancel();throw new Error('body limit')}
          chunks.push(value)
        }
      } finally {reader.releaseLock()}
      const value:unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      if (value && typeof value === 'object' && 'error' in value && value.error === true) throw new Error('provider error')
      return value
    } catch { throw new AffiliateProviderError(uncertain) }
  }
  private path(action:string,jid?:string) {return `/${action}/${encodeURIComponent(this.config.instance)}${jid ? `?groupJid=${encodeURIComponent(jid)}`:''}`}
  async group(jid:string) {
    const group = parseGroup(await this.request(this.path('group/findGroupInfos',jid)))
    if (group.jid !== jid) throw new AffiliateProviderError(false)
    return group
  }
  async groups() {
    const data = await this.request(this.path('group/fetchAllGroups')+'?getParticipants=false')
    if (!Array.isArray(data) || data.length > 5000) throw new AffiliateProviderError(false)
    return data.map(parseGroup)
  }
  async invite(jid:string) {
    const cached=await this.inviteCache?.get('invite:'+jid)
    if(cached){try{return validInvite(cached)}catch{/* Invalid cached data must not become a redirect. */}}
    const data = z.object({inviteUrl:z.string().optional(),inviteCode:z.string().optional()}).safeParse(await this.request(this.path('group/inviteCode',jid)))
    if (!data.success) throw new AffiliateProviderError(false)
    const url=validInvite(data.data.inviteUrl ?? data.data.inviteCode)
    await this.inviteCache?.set('invite:'+jid,url,30)
    return url
  }
  async create(name:string,description:string) {
    if (!this.config.ownerPhone || !/^\d{10,15}$/.test(this.config.ownerPhone)) throw new AffiliateError(409,'Informe o WhatsApp do participante inicial antes de criar grupos automaticamente.')
    const value = await this.request(this.path('group/create'),{subject:name,...(description?{description}:{}),participants:[this.config.ownerPhone]},true)
    const parsed = z.object({id:groupJid}).safeParse(value)
    if (!parsed.success) throw new AffiliateProviderError(true)
    return parsed.data.id
  }
  async picture(jid:string,url:string) {
    const source = imageUrl.safeParse(url)
    // Stored uploads are decoded and normalized to bounded WebP before this boundary.
    const uploaded = url.length <= 349528 && /^UklGR[A-Za-z0-9+/]+={0,2}$/.test(url)
    if ((!source.success || !source.data) && !uploaded) throw new AffiliateError(400,'Use uma imagem enviada pelo painel ou uma imagem HTTPS autorizada para o grupo.')
    const value = await this.request(this.path('group/updateGroupPicture'),{groupJid:jid,image:uploaded?url:source.data})
    if (!z.object({update:z.literal('success')}).safeParse(value).success) throw new AffiliateProviderError(false)
  }
  async avatar(jid:string) {
    const value = await this.request(this.path('chat/fetchProfilePictureUrl'),{number:jid})
    const parsed = z.object({wuid:groupJid,profilePictureUrl:z.string().nullable()}).safeParse(value)
    if (!parsed.success || parsed.data.wuid !== jid || !imageUrl.safeParse(parsed.data.profilePictureUrl).success) throw new AffiliateProviderError(false)
    return parsed.data.profilePictureUrl
  }
  async describe(jid:string,description:string) {
    const value = await this.request(this.path('group/updateGroupDescription'),{groupJid:jid,description})
    if (!z.object({update:z.literal('success')}).safeParse(value).success) throw new AffiliateProviderError(false)
  }
  async send(jid:string,message:string,imageUrl:string|null) {
    const value = await this.request(this.path(imageUrl?'message/sendMedia':'message/sendText'),imageUrl?{number:jid,mediatype:'image',media:imageUrl,caption:message}:{number:jid,text:message},true)
    const parsed = z.object({key:z.object({id:z.string().min(1).max(200)})}).safeParse(value)
    if (!parsed.success) throw new AffiliateProviderError(true)
    return parsed.data.key.id
  }
  async status(options?:{fresh:true}) {
    if(!options?.fresh&&await this.inviteCache?.get('open')==='1')return {state:'open'}
    const value = z.object({instance:z.object({state:z.enum(['open','close','connecting'])})}).safeParse(await this.request(this.path('instance/connectionState')))
    if(value.success&&value.data.instance.state==='open')await this.inviteCache?.set('open','1',5)
    return {state:value.success?value.data.instance.state:'unknown'}
  }
  async connect() {
    const value = await this.request(this.path('instance/connect'))
    const connection = z.object({instance:z.object({state:z.enum(['open','close','connecting'])})}).safeParse(value)
    if (connection.success) return {state:connection.data.instance.state}
    const parsed = z.object({base64:z.string().max(400_000).regex(/^data:image\/png;base64,[A-Za-z0-9+/=\r\n]+$/).nullish(),code:z.string().max(5000).nullish(),pairingCode:z.string().max(100).nullish(),count:z.number().int().nonnegative().optional()}).safeParse(value)
    if (!parsed.success || (!parsed.data.base64 && !parsed.data.code && !parsed.data.pairingCode && parsed.data.count === undefined)) throw new AffiliateProviderError(false)
    return {state:'connecting' as const,...(parsed.data.base64?{base64:parsed.data.base64}:{}),...(parsed.data.code?{code:parsed.data.code}:{}),...(parsed.data.pairingCode?{pairingCode:parsed.data.pairingCode}:{})}
  }
  async createInstance() {
    const value = await this.request('/instance/create',{instanceName:this.config.instance,integration:'WHATSAPP-BAILEYS',qrcode:true,token:this.config.apiKey},true)
    const parsed = z.object({instance:z.object({instanceName:z.string()})}).safeParse(value)
    if (!parsed.success || parsed.data.instance.instanceName !== this.config.instance) throw new AffiliateProviderError(true)
  }
}
