import type { PrismaClient } from '@prisma/client'
/** Only rows created by the calling test; never shared/global billing cleanup. */
export async function cleanBillingFixture(db: PrismaClient, tenantId: string) {
  const where = { tenantId }
  await db.profileBillingEvent.deleteMany({where})
  await db.profileBillingOperation.deleteMany({where})
  await db.profileEntitlement.deleteMany({where})
  await db.profileSubscription.deleteMany({where})
  await db.profileBillingAccount.deleteMany({where})
  await db.profilePlanVersion.deleteMany({where})
  await db.profilePlan.deleteMany({where})
  await db.profileBillingSettings.deleteMany({where})
}
