import {useRef} from 'react'
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {useProfileInteraction} from './use-profile-interaction'
import {writeProfileMeasurementConsent} from '@/domain/profile-measurement-consent'
const api=vi.hoisted(()=>vi.fn().mockResolvedValue({status:201,body:{counted:true}}))
vi.mock('@/lib/api',()=>({api}))
let observe!:(entries:Partial<IntersectionObserverEntry>[])=>void
const descriptor={profileId:'12345678-1234-4234-8234-123456789abc',revisionId:1,surfaceToken:'signed-purpose',issuedAt:'2026-10-18T12:00:00Z',expiresAt:'2026-10-18T12:15:00Z'}
function Fixture({disabled=false}:{disabled?:boolean}){const root=useRef<HTMLDivElement>(null);useProfileInteraction(root,descriptor,disabled);return <div ref={root}><input aria-label="Busca"/><a href="#destination" data-profile-block-id="22345678-1234-4234-8234-123456789abc">Meu link</a></div>}
beforeEach(()=>{
 vi.stubGlobal('IntersectionObserver',class {constructor(callback:typeof observe){observe=callback}observe(){}unobserve(){}disconnect(){}})
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'})
 api.mockResolvedValue({status:201,body:{counted:true}})
})
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();vi.clearAllMocks();document.cookie='tla_profile_measure=; Path=/; Max-Age=0';document.cookie='tla_consent=; Path=/; Max-Age=0'})
it('F31-C03 old ads permission sends nothing; dedicated consent starts measurement without reading typed content',async()=>{
 document.cookie='tla_consent=marketing; Path=/'
 render(<Fixture/>);fireEvent.change(screen.getByLabelText('Busca'),{target:{value:'PII-SECRET pessoa@example.org'}});expect(api).not.toHaveBeenCalled()
 act(()=>writeProfileMeasurementConsent(true));await waitFor(()=>expect(api).toHaveBeenCalled())
 fireEvent.click(screen.getByRole('link',{name:'Meu link'}));await waitFor(()=>expect(api.mock.calls.some(([,init])=>JSON.parse(init.body).kind==='CLICK')).toBe(true))
 expect(JSON.stringify(api.mock.calls)).not.toMatch(/PII-SECRET|pessoa@example|destination|Busca/)
 act(()=>writeProfileMeasurementConsent(false));const count=api.mock.calls.length;fireEvent.click(screen.getByRole('link'));await act(async()=>{});expect(api).toHaveBeenCalledTimes(count)
})
it('F31-C04 a visible impression needs 50% for a continuous second; preview never observes',async()=>{
 vi.useFakeTimers();document.cookie='tla_profile_measure=v1_yes; Path=/'
 const view=render(<Fixture/>);const target=screen.getByRole('link')
 act(()=>observe([{target,isIntersecting:true,intersectionRatio:.5}]))
 await act(async()=>{await vi.advanceTimersByTimeAsync(999)})
 expect(api.mock.calls.some(([,init])=>JSON.parse(init.body).kind==='IMPRESSION')).toBe(false)
 act(()=>observe([{target,isIntersecting:true,intersectionRatio:.2}]))
 await act(async()=>{await vi.advanceTimersByTimeAsync(1)})
 expect(api.mock.calls.some(([,init])=>JSON.parse(init.body).kind==='IMPRESSION')).toBe(false)
 act(()=>observe([{target,isIntersecting:true,intersectionRatio:.5}]))
 await act(async()=>{await vi.advanceTimersByTimeAsync(1000)})
 expect(api.mock.calls.filter(([,init])=>JSON.parse(init.body).kind==='IMPRESSION')).toHaveLength(1)
 view.unmount();api.mockClear();render(<Fixture disabled/>);await act(async()=>{});expect(api).not.toHaveBeenCalled()
})

function CampaignFixture(){const root=useRef<HTMLDivElement>(null);useProfileInteraction(root,{...descriptor,campaignId:'32345678-1234-4234-8234-123456789abc'},false);return <div ref={root}><a href="#campaign" data-profile-block-id="22345678-1234-4234-8234-123456789abc">Link da campanha</a></div>}
it('F15-C04 the same observer dispatches campaign events only to its scoped endpoint after consent',async()=>{
 document.cookie='tla_profile_measure=v1_yes; Path=/';render(<CampaignFixture/>);await waitFor(()=>expect(api).toHaveBeenCalled());expect(api.mock.calls.every(([path])=>path==='/v1/analytics/profiles/campaigns/32345678-1234-4234-8234-123456789abc/events')).toBe(true);expect(JSON.parse(api.mock.calls[0][1].body).profileId).toBe(descriptor.profileId)
})
