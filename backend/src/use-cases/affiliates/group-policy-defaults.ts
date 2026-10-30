import type { Prisma, PrismaClient } from '@prisma/client'
import { AffiliateError } from '@/domain/affiliates/contracts'
import { groupPolicyInput, type AffiliateGroupPolicy } from '@/domain/affiliates/group-policy'

export const AFFILIATE_GROUP_POLICY_DEFAULTS_KEY='AFFILIATE_GROUP_POLICY_DEFAULTS'
type Store=Pick<Prisma.TransactionClient,'config'>
const where=(tenantId:string)=>({tenantId_key:{tenantId,key:AFFILIATE_GROUP_POLICY_DEFAULTS_KEY}})

export async function readAffiliateGroupPolicyDefaults(db:Store,tenantId:string):Promise<AffiliateGroupPolicy|null> {
  const row=await db.config.findUnique({where:where(tenantId)})
  if(!row)return null
  try {return groupPolicyInput.parse(JSON.parse(row.value))}
  catch {throw new AffiliateError(503,'Confira a política padrão de grupos desta conta antes de criar uma segmentação.')}
}

export async function saveAffiliateGroupPolicyDefaults(db:PrismaClient,tenantId:string,actorId:string,input:AffiliateGroupPolicy) {
  const policy=groupPolicyInput.parse(input)
  await db.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`
    if(!await tx.user.findFirst({where:{id:actorId,tenantId,role:'ADMIN',status:'ACTIVE'},select:{id:true}}))throw new AffiliateError(403,'Acesso negado.')
    const value=JSON.stringify(policy)
    const row=await tx.config.upsert({where:where(tenantId),create:{tenantId,key:AFFILIATE_GROUP_POLICY_DEFAULTS_KEY,value},update:{value}})
    await tx.auditLog.create({data:{tenantId,actorId,action:'affiliate.group_policy_defaults.updated',entityType:'Config',entityId:row.id,after:policy}})
  })
  return {saved:true}
}

// Missing account settings preserve the existing Prisma defaults; malformed settings never disable approval silently.
export async function affiliateSegmentGroupPolicyDefaults(db:Store,tenantId:string) {
  const policy=await readAffiliateGroupPolicyDefaults(db,tenantId)
  return policy?{groupPolicyEnabled:policy.enabled,groupDisappearingSeconds:policy.disappearingSeconds,groupJoinApproval:policy.joinApproval,groupAutoApproveDelaySeconds:policy.autoApproveDelaySeconds}:{}
}
