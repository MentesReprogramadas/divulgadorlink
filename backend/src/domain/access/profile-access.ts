import {createHash,createHmac,randomBytes} from 'node:crypto'
export type ProfilePermission='READ'|'EDIT'|'PUBLISH'|'OWNER'
export type ProfileRole='OWNER'|'EDITOR'|'VIEWER'
// Global workspace guards supply auditActorId; actorId remains the legacy page-membership identity.
export type ProfileActor={tenantId:string;ownerId:string;age:boolean;auditActorId?:string;actorId?:string;permission?:ProfilePermission;profileId?:string}
export function permits(role:ProfileRole|null,status:string,permission:ProfilePermission){return status==='ACTIVE'&&(role==='OWNER'||permission==='READ'&&role==='VIEWER'||role==='EDITOR'&&permission!=='OWNER')}
export function invitationAvailable(invite:{expiresAt:Date;usedAt:Date|null;revokedAt:Date|null},now:Date){return !invite.usedAt&&!invite.revokedAt&&invite.expiresAt>now}
export const invitationToken=()=>randomBytes(32).toString('base64url')
export const tokenDigest=(token:string)=>createHash('sha256').update(token).digest('hex')
export const recipientDigest=(email:string,secret:string)=>createHmac('sha256',secret).update('profile-invitation-email.v1\0'+email.trim().toLowerCase()).digest('hex')
export function profilePermission(method:string,path:string):ProfilePermission{
 if(path==='/me/profile/hosts'||path==='/me/profile/hosts/verify')return method==='GET'?'READ':'PUBLISH'
 if(method==='GET'&&['/me/profile','/me/profile/preview','/me/profile/preview/items','/me/profile/catalog','/me/profile/channel-groups'].includes(path))return 'READ'
 if(method==='GET'&&/^\/me\/profile\/(avatar\/[a-f0-9]{64})$/.test(path))return 'READ'
 if(method==='GET'&&/^\/me\/profile\/channel-destinations(?:\/[^/]+)?$/.test(path))return 'EDIT'
 if(method==='PATCH'&&path==='/me/profile'||method==='POST'&&['/me/profile/avatar','/me/profile/discard'].includes(path)||['PUT','DELETE'].includes(method)&&/^\/me\/profile\/channel-groups\/[a-f0-9-]{36}$/.test(path))return 'EDIT'
 if(method==='POST'&&['/me/profile/publish','/me/profile/unpublish'].includes(path))return 'PUBLISH'
 return 'OWNER'
}
