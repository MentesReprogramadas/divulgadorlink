import type { AffiliateGroup, AffiliateSegment, PrismaClient } from '@prisma/client'
import { validInvite } from '@/domain/affiliates/contracts'

export async function resolveStoredAffiliateInvite(db:PrismaClient,tenantId:string,segment:AffiliateSegment,group:AffiliateGroup,redirectOnly=false):Promise<{url:string}|null> {
  if(!group.inviteUrl || !Number.isFinite(group.participantCount) || group.participantCount<0 || group.participantCount>=Math.min(group.capacity,segment.capacity))return null
  let url:string
  try {url=validInvite(group.inviteUrl)} catch {return null}
  // WhatsApp enforces current capacity; a disconnected automation account must not gate a saved invitation.
  const enabled=await db.affiliateGroup.count({where:{id:group.id,tenantId,enabled:true,updatedAt:group.updatedAt,segment:{enabled:true,updatedAt:segment.updatedAt,...(redirectOnly?{joinMode:'REDIRECT'}:{})}}})
  return enabled?{url}:null
}
