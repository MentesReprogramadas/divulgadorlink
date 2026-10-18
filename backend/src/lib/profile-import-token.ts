import {createHmac,timingSafeEqual} from 'node:crypto'
import {z} from 'zod'
import {env} from '@/env'
import {ProfileError} from '@/domain/profiles/profile'
const input=z.object({tenantId:z.string(),ownerId:z.string(),version:z.number().int().nonnegative(),key:z.string().uuid(),expiresAt:z.number().int(),lines:z.array(z.string().max(2048)).max(500)}).strict()
export type ProfileImportTicket=z.infer<typeof input>
const signature=(body:string)=>createHmac('sha256',env.JWT_SECRET).update('profile-import-v1\0'+body).digest()
export function signProfileImport(ticket:ProfileImportTicket):string{
 const body=Buffer.from(JSON.stringify(input.parse(ticket))).toString('base64url')
 if(body.length>159900)throw new ProfileError(422,'O lote é muito grande. Divida os endereços em lotes menores.')
 return body+'.'+signature(body).toString('base64url')
}
/** Private transport only. The signature is domain-separated from access tokens. */
export function readProfileImport(token:string,actor:{tenantId:string;ownerId:string}):ProfileImportTicket{
 try{
  if(token.length>160000)throw new Error('size')
  const [body,sig,...extra]=token.split('.');if(!body||!sig||extra.length)throw new Error('shape')
  const actual=Buffer.from(sig,'base64url'),expected=signature(body)
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new Error('signature')
  const parsed=input.parse(JSON.parse(Buffer.from(body,'base64url').toString('utf8')))
  if(parsed.tenantId!==actor.tenantId||parsed.ownerId!==actor.ownerId)throw new Error('actor')
  return parsed
 }catch{throw new ProfileError(422,'Esta revisão não é válida. Confira os endereços novamente.')}
}
