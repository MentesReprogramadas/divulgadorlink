import {createHmac,timingSafeEqual} from 'node:crypto'
import {z} from 'zod'
export const PROFILE_MEASUREMENT_TOKEN_MS=15*60*1000
const common={tenantId:z.string().min(1).max(128),profileId:z.string().uuid(),revisionId:z.number().int().positive(),expiresAt:z.number().int().positive()}
const claims=z.discriminatedUnion('purpose',[
 z.object({...common,purpose:z.literal('profile-interaction.v1')}).strict(),
 z.object({...common,purpose:z.literal('campaign-interaction.v1'),campaignId:z.string().uuid()}).strict(),
])
type Context={tenantId:string;profileId:string;revisionId:number}
function sign(context:Context&{campaignId?:string},secret:string,now:Date){
 const body=Buffer.from(JSON.stringify({...context,purpose:context.campaignId?'campaign-interaction.v1':'profile-interaction.v1',expiresAt:now.getTime()+PROFILE_MEASUREMENT_TOKEN_MS})).toString('base64url')
 return body+'.'+createHmac('sha256',secret).update(body).digest('base64url')
}
function read(token:string,context:Context&{campaignId?:string},secret:string,now:Date):boolean{
 try{
  if(token.length>2048)return false
  const [body,signature,extra]=token.split('.');if(!body||!signature||extra)return false
  const actual=Buffer.from(signature,'base64url'),expected=createHmac('sha256',secret).update(body).digest()
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return false
  const data=claims.parse(JSON.parse(Buffer.from(body,'base64url').toString('utf8')))
  const scope=context.campaignId?data.purpose==='campaign-interaction.v1'&&data.campaignId===context.campaignId:data.purpose==='profile-interaction.v1'
  return scope&&data.tenantId===context.tenantId&&data.profileId===context.profileId&&data.revisionId===context.revisionId&&data.expiresAt>now.getTime()&&data.expiresAt<=now.getTime()+PROFILE_MEASUREMENT_TOKEN_MS
 }catch{return false}
}
export function signProfileInteraction(context:Context,secret:string,now=new Date()){return sign({tenantId:context.tenantId,profileId:context.profileId,revisionId:context.revisionId},secret,now)}
export function readProfileInteraction(token:string,context:Context,secret:string,now=new Date()){return read(token,{tenantId:context.tenantId,profileId:context.profileId,revisionId:context.revisionId},secret,now)}
export function signCampaignInteraction(context:Context&{campaignId:string},secret:string,now=new Date()){return sign(context,secret,now)}
export function readCampaignInteraction(token:string,context:Context&{campaignId:string},secret:string,now=new Date()){return read(token,context,secret,now)}
