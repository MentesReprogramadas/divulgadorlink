import type { AffiliateInstance, PrismaClient } from '@prisma/client'
import type { AffiliateWhatsApp } from '@/adapters/affiliates/evolution'
import { validInvite } from '@/domain/affiliates/contracts'
import { affiliateInviteEvolution } from './instances'
import { resolveStoredAffiliateInvite } from './stored-invite'

// GET may resolve existing invitations, but must never sync, rotate or provision groups.
export async function resolveAffiliateInviteDestination(db:PrismaClient,tenantId:string,slug:string,factory:(instance:AffiliateInstance)=>AffiliateWhatsApp=affiliateInviteEvolution):Promise<{url:string}|null> {
  const segment=await db.affiliateSegment.findFirst({where:{tenantId,slug,enabled:true,joinMode:'REDIRECT'},include:{instance:true,instanceLinks:{include:{instance:true},orderBy:[{lastUsedAt:'asc'},{instanceId:'asc'}]},groups:{where:{enabled:true},include:{instance:true},orderBy:{sequence:'desc'},take:1}}})
  if(!segment)return null
  const accounts=segment.instanceLinks.length?segment.instanceLinks.map(link=>link.instance).filter(instance=>instance.enabled):segment.instance?.enabled?[segment.instance]:[]
  for(const group of segment.groups){
    const saved=await resolveStoredAffiliateInvite(db,tenantId,segment,group,true)
    if(saved)return saved
    const candidates=segment.instanceLinks.length?accounts:group.instance.enabled?[group.instance]:accounts
    for(const instance of candidates){
      try {
        const whatsapp=factory(instance)
        const [status,live,url]=await Promise.all([whatsapp.status?whatsapp.status():Promise.resolve({state:'open'}),whatsapp.group(group.jid),whatsapp.invite(group.jid)])
        if(status.state!=='open')continue
        if(live.participantCount>=Math.min(group.capacity,segment.capacity))return null
        const destination=validInvite(url)
        const [enabled,connected]=await Promise.all([
          db.affiliateGroup.count({where:{id:group.id,tenantId,enabled:true,updatedAt:group.updatedAt,segment:{enabled:true,joinMode:'REDIRECT',updatedAt:segment.updatedAt}}}),
          db.affiliateInstance.count({where:{id:instance.id,tenantId,enabled:true,updatedAt:instance.updatedAt}}),
        ])
        if(enabled&&connected)return {url:destination}
      } catch { /* The established POST flow handles unavailable providers and expansion. */ }
    }
  }
  return null
}
