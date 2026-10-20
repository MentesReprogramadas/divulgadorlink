import {createHash,timingSafeEqual} from 'node:crypto'

export const challengeMinutes=30,verificationDays=30,evidenceDays=180
const sharedHosts=['whatsapp.com','whatsapp.net','t.me','telegram.me','telegram.org','instagram.com','facebook.com','fb.com','youtube.com','youtu.be','tiktok.com','discord.com','discord.gg','x.com','twitter.com','linktr.ee','temlinkaqui.com']
export function ownershipFile(destination:string){
 const url=new URL(destination),host=url.hostname.toLowerCase()
 if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443')throw new Error('Destino HTTPS exigido')
 if(sharedHosts.some(value=>host===value||host.endsWith('.'+value)))return null
 return url.origin+'/.well-known/temlinkaqui-verification.txt'
}
export const ownershipHash=(token:string)=>createHash('sha256').update(token).digest('hex')
export function matchesOwnership(body:string,hash:string){const candidate=body.trim();return /^[a-f0-9]{64}$/.test(candidate)&&timingSafeEqual(Buffer.from(ownershipHash(candidate),'hex'),Buffer.from(hash,'hex'))}
export function validOwnership(value:{ownerId:string;revisionId:string;destinationUrl:string;verifiedAt:Date|null;validUntil:Date|null;revokedAt:Date|null},current:{ownerId:string;activeRevisionId:string|null;destinationUrl:string;disabled:boolean},now:Date){return !current.disabled&&!value.revokedAt&&!!value.verifiedAt&&!!value.validUntil&&value.validUntil>now&&value.ownerId===current.ownerId&&value.revisionId===current.activeRevisionId&&value.destinationUrl===current.destinationUrl}
