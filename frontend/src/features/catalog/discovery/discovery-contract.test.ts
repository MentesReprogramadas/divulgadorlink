import {expect,it} from 'vitest'
import {discoveryParams,readDiscovery,discoveryHref,emptyDiscovery} from './discovery-contract'
it('F27-C04 filters preserve canonical values, compose with facets and reset to no filter without inventing defaults',()=>{
 expect(readDiscovery(new URLSearchParams())).toEqual(emptyDiscovery())
 const filters=readDiscovery(new URLSearchParams('cityId=3550308&languageTag=pt-BR&modality=online'))
 expect(discoveryParams(filters).toString()).toBe('cityId=3550308&languageTag=pt&modality=ONLINE')
 expect(discoveryHref('/nicho/estudos?rede=telegram',filters)).toBe('/nicho/estudos?rede=telegram&cityId=3550308&languageTag=pt&modality=ONLINE')
 for(const raw of ['cityId=123','cityId=3550308&cityId=3543402','languageTag=%3Cscript%3E','languageTag=en-$$$$','modality=HYBRID'])expect(()=>readDiscovery(new URLSearchParams(raw))).toThrow()
 expect(readDiscovery(new URLSearchParams('languageTag=iw')).languageTag).toBe('he')
 expect(readDiscovery(new URLSearchParams('languageTag=tl-PH')).languageTag).toBe('tl')
})
