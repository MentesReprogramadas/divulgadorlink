import type {Prisma} from '@prisma/client'
/** Direct F20 grants remain independent; agency-derived grants bind both delegation versions. */
export async function agencyDerivedAccess(tx:Prisma.TransactionClient,membershipId:string,version:number){
 const grant=(await tx.$queryRaw<Array<{active:boolean}>>`
 SELECT EXISTS(
  SELECT 1 FROM agency_clients c JOIN profiles p ON p.id=c."profileId" AND p."tenantId"=c."tenantId" AND p."ownerId"=c."clientOwnerId"
  JOIN users agency ON agency.id=r."agencyOwnerId" AND agency."tenantId"=r."tenantId" AND agency.status='ACTIVE'
  JOIN workspace_memberships w ON w.id=r."workspaceMembershipId" AND w."tenantId"=r."tenantId" AND w."ownerId"=r."agencyOwnerId" AND w."userId"=r."userId" AND w.version=r."workspaceMembershipVersion" AND w."revokedAt" IS NULL
  LEFT JOIN profile_memberships parent ON parent.id=r."parentMembershipId" AND parent.version=r."parentMembershipVersion" AND parent.status='ACTIVE' AND parent.role='EDITOR' AND parent."profileId"=c."profileId" AND parent."tenantId"=c."tenantId" AND parent."ownerId"=c."clientOwnerId" AND parent."userId"=r."agencyOwnerId"
  WHERE c.id=r."clientId" AND c."archivedAt" IS NULL AND (p."ownerId"=r."agencyOwnerId" OR parent.id IS NOT NULL)
 ) AS active FROM agency_access_requests r WHERE r."membershipId"=${membershipId} AND r."membershipVersion"=${version} AND r.status='APPROVED' LIMIT 1`)[0]
 return grant?.active??true
}
