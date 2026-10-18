import Stripe from 'stripe-billing'
import { env } from '../src/env'
import { prisma } from '../src/lib/prisma'
import { setProfileBillingForTest } from '../src/lib/profile-billing'
import { StripeBillingGateway } from '../src/adapters/billing/stripe-billing-gateway'
import { PROFILE_CAPABILITIES } from '../src/domain/billing/profile-plans'
import { existsSync, readFileSync } from 'node:fs'
import { setProfileClockForTest } from '../src/lib/profile-clock'
// Explicit E2E entry points only. No production route or environment flag swaps the gateway.
export function composeBillingE2e() {
  if (env.NODE_ENV === 'production') throw new Error('Local billing fixture only')
  const clockFile=new URL('../../frontend/e2e/.runtime/profile-clock.json',import.meta.url)
  setProfileClockForTest(()=>{
    if(!existsSync(clockFile))return new Date()
    const value=new Date(JSON.parse(readFileSync(clockFile,'utf8')).now)
    if(!Number.isFinite(value.getTime()))throw new Error('Invalid local profile clock fixture')
    return value
  })
  const port = 4099 + Number(process.env.E2E_PORT_OFFSET || 0)
  const client = new Stripe('sk_test_local_fixture', { host:'127.0.0.1',port,protocol:'http',timeout:1500,maxNetworkRetries:0,telemetry:false })
  setProfileBillingForTest(prisma,{enabled:true,production:false,webhookReady:true,gateway:new StripeBillingGateway(client,'whsec_local_fixture',false),delivered:new Set(PROFILE_CAPABILITIES)})
}
