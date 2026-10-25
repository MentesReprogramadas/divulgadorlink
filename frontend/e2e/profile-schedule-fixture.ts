import {randomUUID} from 'node:crypto'
import {mkdirSync,writeFileSync,rmSync} from 'node:fs'
import path from 'node:path'
import {sql} from './db'
const clockFile=path.join(__dirname,'.runtime/profile-clock.json')
export function setProfileTestClock(now:string){mkdirSync(path.dirname(clockFile),{recursive:true});writeFileSync(clockFile,JSON.stringify({now}))}
export function clearProfileTestClock(){rmSync(clockFile,{force:true})}
export function resetProfileScheduling(t:string){sql(`BEGIN; DELETE FROM profile_billing_events WHERE "tenantId"='${t}'; DELETE FROM profile_billing_operations WHERE "tenantId"='${t}'; DELETE FROM profile_entitlements WHERE "tenantId"='${t}'; DELETE FROM profile_subscriptions WHERE "tenantId"='${t}'; DELETE FROM profile_plan_versions WHERE "tenantId"='${t}'; DELETE FROM profile_plans WHERE "tenantId"='${t}'; DELETE FROM profile_billing_accounts WHERE "tenantId"='${t}'; DELETE FROM profiles WHERE "tenantId"='${t}'; COMMIT;`)}
export function grantProfileCapability(f:{tenantId:string;ownerId:string},capability:"profile.scheduling"|"profile.analytics"){
 const ownerRow=sql(`SELECT json_build_object('accountId',a.id,'subscriptionId',s.id,'planId',v."planId",'capabilities',coalesce(v.capabilities,ARRAY[]::text[])) FROM profile_billing_accounts a LEFT JOIN profile_subscriptions s ON s."accountId"=a.id AND s."tenantId"=a."tenantId" AND s."ownerId"=a."ownerId" LEFT JOIN profile_plan_versions v ON v.id=s."planVersionId" AND v."tenantId"=s."tenantId" WHERE a."tenantId"='${f.tenantId}' AND a."ownerId"='${f.ownerId}' ORDER BY s."createdAt" DESC NULLS LAST LIMIT 1`)
 const owner=ownerRow?JSON.parse(ownerRow) as {accountId:string;subscriptionId:string|null;planId:string|null;capabilities:string[]}:null
 const existingPlan=owner?.planId||sql(`SELECT id FROM profile_plans WHERE "tenantId"='${f.tenantId}' AND tier='PRO'`)
 const plan=existingPlan||randomUUID(),capabilities=[...new Set(['profile.page','profile.categories','profile.appearance','profile.history',...(owner?.capabilities??[]),capability])]
 const array='ARRAY['+capabilities.map(value=>"'"+value.replaceAll("'","''")+"'").join(',')+']::text[]'
 const existing=sql(`SELECT id FROM profile_plan_versions WHERE "tenantId"='${f.tenantId}' AND "planId"='${plan}' AND capabilities @> ${array} AND capabilities <@ ${array} ORDER BY "createdAt" DESC LIMIT 1`)
 const version=existing||randomUUID(),account=owner?.accountId||randomUUID(),subscription=owner?.subscriptionId||randomUUID()
 sql(`BEGIN;
${existingPlan?'':`INSERT INTO profile_plans(id,"tenantId",tier,title,version,"createdAt","updatedAt")VALUES('${plan}','${f.tenantId}','PRO','Fixture F14',1,now(),now());`}
${existing?'':`INSERT INTO profile_plan_versions(id,"tenantId","planId",version,"amountCents",capabilities,"providerPriceId","providerProductId","createdAt") SELECT '${version}','${f.tenantId}','${plan}',coalesce(max(version),0)+1,1000,${array},'price_${version.replaceAll('-','')}','prod_f14',now() FROM profile_plan_versions WHERE "planId"='${plan}' AND "tenantId"='${f.tenantId}';`}
${owner?'':`INSERT INTO profile_billing_accounts(id,"tenantId","ownerId","createdAt","updatedAt")VALUES('${account}','${f.tenantId}','${f.ownerId}',now(),now());`}
${owner?.subscriptionId?`UPDATE profile_subscriptions SET "planVersionId"='${version}',status='ACTIVE',"periodStart"='2026-10-01',"periodEnd"='2026-11-01',"paidThrough"='2026-11-01',"updatedAt"=now() WHERE id='${subscription}' AND "tenantId"='${f.tenantId}' AND "ownerId"='${f.ownerId}';`:`INSERT INTO profile_subscriptions(id,"tenantId","ownerId","accountId","planVersionId",status,"periodStart","periodEnd","paidThrough","createdAt","updatedAt")VALUES('${subscription}','${f.tenantId}','${f.ownerId}','${account}','${version}','ACTIVE','2026-10-01','2026-11-01','2026-11-01',now(),now());`}
INSERT INTO profile_entitlements(id,"tenantId","ownerId","subscriptionId",capability,"validFrom","validUntil")VALUES('${randomUUID()}','${f.tenantId}','${f.ownerId}','${subscription}','${capability}','2026-10-01','2026-11-01') ON CONFLICT("subscriptionId",capability) DO UPDATE SET "validFrom"=EXCLUDED."validFrom","validUntil"=EXCLUDED."validUntil","revokedAt"=NULL;COMMIT;`)
}

export function grantProfileScheduling(f:{tenantId:string;ownerId:string}){return grantProfileCapability(f,"profile.scheduling")}
