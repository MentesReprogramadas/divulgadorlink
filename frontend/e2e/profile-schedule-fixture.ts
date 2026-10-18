import {randomUUID} from 'node:crypto'
import {mkdirSync,writeFileSync,rmSync} from 'node:fs'
import path from 'node:path'
import {sql} from './db'
const clockFile=path.join(__dirname,'.runtime/profile-clock.json')
export function setProfileTestClock(now:string){mkdirSync(path.dirname(clockFile),{recursive:true});writeFileSync(clockFile,JSON.stringify({now}))}
export function clearProfileTestClock(){rmSync(clockFile,{force:true})}
export function resetProfileScheduling(t:string){sql(`BEGIN; DELETE FROM profile_billing_events WHERE "tenantId"='${t}'; DELETE FROM profile_billing_operations WHERE "tenantId"='${t}'; DELETE FROM profile_entitlements WHERE "tenantId"='${t}'; DELETE FROM profile_subscriptions WHERE "tenantId"='${t}'; DELETE FROM profile_plan_versions WHERE "tenantId"='${t}'; DELETE FROM profile_plans WHERE "tenantId"='${t}'; DELETE FROM profile_billing_accounts WHERE "tenantId"='${t}'; DELETE FROM profiles WHERE "tenantId"='${t}'; COMMIT;`)}
export function grantProfileCapability(f:{tenantId:string;ownerId:string},capability:"profile.scheduling"|"profile.analytics"){const plan=randomUUID(),version=randomUUID(),account=randomUUID(),subscription=randomUUID();sql(`BEGIN;
INSERT INTO profile_plans(id,"tenantId",tier,title,version,"createdAt","updatedAt")VALUES('${plan}','${f.tenantId}','PRO','Fixture F14',1,now(),now());
INSERT INTO profile_plan_versions(id,"tenantId","planId",version,"amountCents",capabilities,"providerPriceId","providerProductId","createdAt")VALUES('${version}','${f.tenantId}','${plan}',1,1000,ARRAY['profile.page','profile.categories','profile.appearance','profile.history','${capability}'],'price_${version.replaceAll('-','')}','prod_f14',now());
INSERT INTO profile_billing_accounts(id,"tenantId","ownerId","createdAt","updatedAt")VALUES('${account}','${f.tenantId}','${f.ownerId}',now(),now());
INSERT INTO profile_subscriptions(id,"tenantId","ownerId","accountId","planVersionId",status,"periodStart","periodEnd","paidThrough","createdAt","updatedAt")VALUES('${subscription}','${f.tenantId}','${f.ownerId}','${account}','${version}','ACTIVE','2026-10-01','2026-11-01','2026-11-01',now(),now());
INSERT INTO profile_entitlements(id,"tenantId","ownerId","subscriptionId",capability,"validFrom","validUntil")VALUES('${randomUUID()}','${f.tenantId}','${f.ownerId}','${subscription}','${capability}','2026-10-01','2026-11-01');COMMIT;`)}

export function grantProfileScheduling(f:{tenantId:string;ownerId:string}){return grantProfileCapability(f,"profile.scheduling")}
