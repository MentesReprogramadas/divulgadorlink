import {expect,it} from 'vitest'
import {parseDiscovery,matchesDiscovery,discoveryLanguages} from './discovery-metadata'
it('F27-U01/T02 standardizes explicit language/format without deriving a city',()=>{
 expect(parseDiscovery({languageTag:' PT-br ',modality:'online'})).toEqual({cityId:null,languageTag:'pt',modality:'ONLINE'})
 expect(parseDiscovery({languageTag:'iw'}).languageTag).toBe('he')
 expect(parseDiscovery({languageTag:'tl-PH'}).languageTag).toBe('tl')
 for(const language of discoveryLanguages)expect(()=>parseDiscovery({languageTag:language.code})).not.toThrow()
 for(const input of [{languageTag:'zz'},{languageTag:'pt-BR; DROP'},{modality:'HYBRID'},{cityId:'9999999'},{cityId:'São Paulo'}])expect(()=>parseDiscovery(input)).toThrow()
})
it('F27-U02/T03 only accepts an explicit known municipality ID, not IP/device/geolocation',()=>{
 expect(parseDiscovery({cityId:'3550308'})).toEqual({cityId:'3550308',languageTag:null,modality:null})
 expect(parseDiscovery({ip:'1.2.3.4',city:'São Paulo',headers:{'accept-language':'pt-BR'}})).toEqual({cityId:null,languageTag:null,modality:null})
})
it('F27-U03/T01 legacy empty metadata and online/presential do not demand a city',()=>{
 expect(parseDiscovery({})).toEqual({cityId:null,languageTag:null,modality:null})
 for(const modality of ['ONLINE','PRESENTIAL'])expect(parseDiscovery({modality}).cityId).toBeNull()
 expect(parseDiscovery({cityId:'',languageTag:'',modality:''})).toEqual(parseDiscovery({}))
})
it('F27-U04/T04 combines filters with AND; absent never pretends to be a match',()=>{
 const row=parseDiscovery({cityId:'3550308',languageTag:'pt',modality:'ONLINE'})
 expect(matchesDiscovery({},parseDiscovery({}))).toBe(true)
 expect(matchesDiscovery({},row)).toBe(false)
 expect(matchesDiscovery(row,row)).toBe(true)
 expect(matchesDiscovery(row,parseDiscovery({cityId:'3543402',modality:'ONLINE'}))).toBe(false)
 expect(matchesDiscovery(row,parseDiscovery({languageTag:'es'}))).toBe(false)
})
