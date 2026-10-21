import {useRef} from 'react'
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {useButtonTest} from './use-button-test'
import {emptyProfile} from './profile-contract'
import {writeProfileMeasurementConsent} from '@/domain/profile-measurement-consent'
const api=vi.hoisted(()=>vi.fn())
vi.mock('@/lib/api',()=>({api}))
let observe!:(entries:Partial<IntersectionObserverEntry>[])=>void
const assignment={id:'test',variant:1,revisionId:1,blockId:'button',label:'Versão B'},profile={...emptyProfile(),locale:'pt-BR' as const,fallbackLocale:'pt-BR' as const,measurement:{profileId:'profile',revisionId:1,surfaceToken:'signed',issuedAt:'2026-10-21T12:00:00Z',expiresAt:'2026-10-21T12:15:00Z'}}
function Fixture({disabled=false}:{disabled?:boolean}){const root=useRef<HTMLDivElement>(null),test=useButtonTest(root,'ana',profile,disabled);return <div ref={root}><a href="#target" data-profile-block-id="button">{test.assignment?.label??'Original'}</a></div>}
beforeEach(()=>{api.mockReset();api.mockImplementation(async(path:string)=>({status:200,body:path.endsWith('/assignment')?{assignment}:{counted:true}}));Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});vi.stubGlobal('IntersectionObserver',class{constructor(callback:typeof observe){observe=callback}observe(){}unobserve(){}disconnect(){}})})
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();document.cookie='tla_profile_measure=; Path=/; Max-Age=0'})
it('F26-C01 sem consentimento ou em prévia usa original e não cria identificador',async()=>{
 const view=render(<Fixture/>);expect(screen.getByRole('link').textContent).toBe('Original');expect(api).not.toHaveBeenCalled();act(()=>writeProfileMeasurementConsent(true));await screen.findByText('Versão B');act(()=>writeProfileMeasurementConsent(false));await screen.findByText('Original');const count=api.mock.calls.length;fireEvent.click(screen.getByRole('link'));expect(api).toHaveBeenCalledTimes(count);view.unmount();render(<Fixture disabled/>);expect(api).toHaveBeenCalledTimes(count)
})
it('F26-C02 clique exige exposição contínua antes de enviar e não duplica',async()=>{
 document.cookie='tla_profile_measure=v1_yes; Path=/';render(<Fixture/>);await screen.findByText('Versão B');await waitFor(()=>expect(observe).toBeTypeOf('function'));vi.useFakeTimers();const target=screen.getByRole('link');fireEvent.click(target);expect(api.mock.calls.filter(([path])=>path.endsWith('/events'))).toHaveLength(0)
 act(()=>observe([{target,isIntersecting:true,intersectionRatio:.5}]));await act(async()=>{await vi.advanceTimersByTimeAsync(1000)});fireEvent.click(target);await act(async()=>{});fireEvent.click(target);expect(api.mock.calls.filter(([,init])=>JSON.parse(init.body).kind==='EXPOSURE')).toHaveLength(1);expect(api.mock.calls.filter(([,init])=>JSON.parse(init.body).kind==='CLICK')).toHaveLength(1)
})
it('F26-C03 falha de atribuição conserva o botão original sem inventar exposição',async()=>{document.cookie='tla_profile_measure=v1_yes; Path=/';api.mockRejectedValue(new Error('offline'));render(<Fixture/>);await waitFor(()=>expect(api).toHaveBeenCalledTimes(1));expect(screen.getByRole('link').textContent).toBe('Original');expect(api.mock.calls.some(([path])=>path.endsWith('/events'))).toBe(false)})
