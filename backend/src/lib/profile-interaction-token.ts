import {createHmac,timingSafeEqual} from 'node:crypto'
import {z} from 'zod'
export const PROFILE_MEASUREMENT_TOKEN_MS=15*60*1000
const claims=z.object({purpose:z.literal('profile-interaction.v1'),tenantId:z.string().min(1).max(128),profileId:z.string().uuid(),revisionId:z.number().int().positive(),expiresAt:z.number().int().positive()}).strict()
type Context={tenantId:string;profileId:string;revisionId:number}
export function signProfileInteraction(context:Context,secret:string,now=new Date()){
 const body=Buffer.from(JSON.stringify({...context,purpose:'profile-interaction.v1',expiresAt:now.getTime()+PROFILE_MEASUREMENT_TOKEN_MS})).toString('base64url')
 return body+'.'+createHmac('sha256',secret).update(body).digest('base64url')
}
export function readProfileInteraction(token:string,context:Context,secret:string,now=new Date()):boolean{
 try{
  if(token.length>2048)return false
  const [body,signature,extra]=token.split('.');if(!body||!signature||extra)return false
  const actual=Buffer.from(signature,'base64url'),expected=createHmac('sha256',secret).update(body).digest()
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return false
  const data=claims.parse(JSON.parse(Buffer.from(body,'base64url').toString('utf8')))
  return data.tenantId===context.tenantId&&data.profileId===context.profileId&&data.revisionId===context.revisionId&&data.expiresAt>now.getTime()&&data.expiresAt<=now.getTime()+PROFILE_MEASUREMENT_TOKEN_MS
 }catch{return false}
}
