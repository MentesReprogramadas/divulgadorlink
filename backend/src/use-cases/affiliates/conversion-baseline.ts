import type {PrismaClient} from '@prisma/client'
import type {AffiliateWhatsApp} from '@/adapters/affiliates/evolution'
import {env} from '@/env'
import {baselineAffiliateMembership} from './membership'
import {readConversionConfig} from './conversions'

export async function baselineProvisionedConversionGroup(db:PrismaClient,tenantId:string,segmentId:string,groupId:string,jid:string,whatsapp:AffiliateWhatsApp) {
  let optedIn=false
  try {
    const config=await readConversionConfig(db,tenantId)
    if(!config?.enabled||config.pixelId!==process.env.META_PIXEL_ID||!config.segmentIds.includes(segmentId))return
    optedIn=true
    if(!whatsapp.participants||!env.WEBHOOK_ENCRYPTION_KEY)throw new Error('secure tracking unavailable')
    await baselineAffiliateMembership(db,tenantId,groupId,env.WEBHOOK_ENCRYPTION_KEY,()=>whatsapp.participants!(jid))
  } catch {
    if(!optedIn)return
    // Provisioning remains commercially available; unavailable tracking never invents qualification.
    await db.affiliateMembershipTracking.upsert({where:{groupId},create:{tenantId,groupId,status:'UNCONFIGURED',lastErrorCode:'CONVERSION_BASELINE_UNAVAILABLE'},update:{status:'UNCONFIGURED',lastErrorCode:'CONVERSION_BASELINE_UNAVAILABLE'}}).catch(()=>undefined)
  }
}
