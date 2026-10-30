import type {PrismaClient} from '@prisma/client'
import type {AffiliateWhatsApp} from '@/adapters/affiliates/evolution'
import {beforeEach,describe,it,expect,vi} from 'vitest'
const mocks=vi.hoisted(()=>({config:vi.fn(),baseline:vi.fn(),key:Buffer.alloc(32,42).toString('base64')}))
vi.mock('@/env',()=>({env:{WEBHOOK_ENCRYPTION_KEY:mocks.key}}))
vi.mock('./conversions',()=>({readConversionConfig:mocks.config}))
vi.mock('./membership',()=>({baselineAffiliateMembership:mocks.baseline}))
import {baselineProvisionedConversionGroup} from './conversion-baseline'
beforeEach(()=>{vi.clearAllMocks();process.env.META_PIXEL_ID='123';mocks.config.mockResolvedValue({enabled:true,pixelId:'123',segmentIds:['segment']});mocks.baseline.mockResolvedValue({ready:true})})
describe('opted-in provisioning baseline',()=>{
 it('awaits the existing baseline before returning and uses group JID without emitting Meta events',async()=>{
  const db={} as PrismaClient,participants=vi.fn().mockResolvedValue(['123@lid']),port={participants} as unknown as AffiliateWhatsApp
  await baselineProvisionedConversionGroup(db,'tenant','segment','group','123@g.us',port)
  expect(mocks.baseline).toHaveBeenCalledWith(db,'tenant','group',mocks.key,expect.any(Function))
  expect(await mocks.baseline.mock.calls[0][4]()).toEqual(['123@lid']);expect(participants).toHaveBeenCalledWith('123@g.us')
 })
 it('does not read participant identities or write tracking for accounts without explicit opt-in',async()=>{
  const upsert=vi.fn(),participants=vi.fn(),db={affiliateMembershipTracking:{upsert}} as unknown as PrismaClient
  for(const settings of [null,{enabled:false,pixelId:'123',segmentIds:['segment']},{enabled:true,pixelId:'999',segmentIds:['segment']},{enabled:true,pixelId:'123',segmentIds:['other']}]) {
   mocks.config.mockResolvedValue(settings)
   await baselineProvisionedConversionGroup(db,'tenant','segment','group','123@g.us',{participants} as unknown as AffiliateWhatsApp)
  }
  expect(mocks.baseline).not.toHaveBeenCalled();expect(participants).not.toHaveBeenCalled();expect(upsert).not.toHaveBeenCalled()
 })
 it('records unavailable tracking without rejecting the commercial join when baseline fails',async()=>{
  const upsert=vi.fn().mockResolvedValue({}),db={affiliateMembershipTracking:{upsert}} as unknown as PrismaClient
  mocks.baseline.mockRejectedValue(new Error('private upstream error'))
  await expect(baselineProvisionedConversionGroup(db,'tenant','segment','group','123@g.us',{participants:vi.fn()} as unknown as AffiliateWhatsApp)).resolves.toBeUndefined()
  expect(upsert).toHaveBeenCalledWith(expect.objectContaining({update:{status:'UNCONFIGURED',lastErrorCode:'CONVERSION_BASELINE_UNAVAILABLE'}}))
  expect(JSON.stringify(upsert.mock.calls)).not.toContain('private upstream')
 })
})
