import {createHmac,timingSafeEqual} from 'node:crypto'
import {z} from 'zod'
export const PROFILE_CHANNEL_TOKEN_MS=15*60*1000
export type ChannelTokenContext={tenantId:string;profileId:string;revisionId:number;channelId:string;destinationRevisionId:string}
const claims=z.object({purpose:z.literal('profile-channel.v1'),tenantId:z.string().min(1).max(128),profileId:z.string().uuid(),revisionId:z.number().int().positive(),channelId:z.string().uuid(),destinationRevisionId:z.string().uuid(),expiresAt:z.number().int().positive()}).strict()
const signature=(body:string,secret:string)=>createHmac('sha256',secret).update('profile-channel-v1\0'+body).digest()
/** Separate purpose/claims: an analytics token cannot authorize a destination choice. */
export function signProfileChannel(context:ChannelTokenContext,secret:string,now=new Date()){
 const body=Buffer.from(JSON.stringify(claims.parse({...context,purpose:'profile-channel.v1',expiresAt:now.getTime()+PROFILE_CHANNEL_TOKEN_MS}))).toString('base64url')
 return body+'.'+signature(body,secret).toString('base64url')
}
export function readProfileChannel(token:string,context:ChannelTokenContext,secret:string,now=new Date()):boolean{
 try{
  if(token.length>2048||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token))return false
  const [body,sig,extra]=token.split('.');if(!body||!sig||extra!==undefined)return false
  const actual=Buffer.from(sig,'base64url'),expected=signature(body,secret);if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return false
  const value=claims.parse(JSON.parse(Buffer.from(body,'base64url').toString('utf8')))
  return value.tenantId===context.tenantId&&value.profileId===context.profileId&&value.revisionId===context.revisionId&&value.channelId===context.channelId&&value.destinationRevisionId===context.destinationRevisionId&&value.expiresAt>now.getTime()&&value.expiresAt<=now.getTime()+PROFILE_CHANNEL_TOKEN_MS
 }catch{return false}
}
