import {expect,it} from 'vitest'
import {randomUUID} from 'node:crypto'
import {profileInput} from './profile-input'
import {localizeProfile,profileTranslationInput,translationTexts} from './profile-translations'
import {visibleProfile} from './profile'
import {profileModerationChanges,profileModerationText} from './profile-moderation'
import {buildProfileExport} from './profile-export'
import {readProfileBackup} from './profile-backup'
const group=randomUUID(),item=randomUUID(),secret=randomUUID()
const content=()=>profileInput.parse({slug:'ana',name:'Ana',bio:'Original',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[{id:group,name:'Projetos',visible:true}],items:[{id:item,categoryId:group,label:'Meu site',type:'URL',destination:'https://example.com',visible:true},{id:secret,categoryId:group,label:'Segredo',type:'URL',destination:'https://example.com/secret',visible:false}],translations:{primaryLocale:'pt-BR',entries:[{locale:'en',name:'Anna',bio:'',categories:{[group]:'Projects'},items:{[item]:'Website',[secret]:'PRIVATE_TRANSLATION'}}]}})
it('F39-U01 valida idioma, duplicação e remove traduções órfãs',()=>{
 const value=content();expect(()=>profileTranslationInput.parse({primaryLocale:'fr',entries:[]})).toThrow();const config=value.translations!;expect(()=>profileTranslationInput.parse({...config,entries:[...config.entries,...config.entries]})).toThrow();expect(profileInput.parse({...value,items:[]}).translations!.entries[0].items).toEqual({})
})
it('F39-U02/U03 fallback mantém destino, esconde traduções de blocos ocultos e modera todos os textos',()=>{
 const value=content(),projected=localizeProfile(visibleProfile(value,new Set()),'en');expect(projected).toMatchObject({name:'Anna',bio:'Original',locale:'en',fallbackLocale:'pt-BR',availableLocales:['pt-BR','en'],translationFallbacks:{bio:true}});expect(projected.items[0]).toMatchObject({label:'Website',destination:'https://example.com'});expect(JSON.stringify(projected)).not.toContain('PRIVATE_TRANSLATION');expect(localizeProfile(visibleProfile(value,new Set()),'es').locale).toBe('pt-BR');expect(translationTexts(value)).toContain('PRIVATE_TRANSLATION');expect(profileModerationText(value)).toContain('PRIVATE_TRANSLATION');expect(profileModerationChanges(value,{...value,translations:undefined}).changedFields.length).toBeGreaterThan(0)
})
it('F39-U04 exportação e importação mantêm traduções com IDs remapeados',()=>{
 const value={...content(),buttonTest:{blockId:item,labels:['A','B'] as [string,string],samplePerVariant:100,durationDays:7 as const}},backup=buildProfileExport(value,'draft',new Date('2026-10-21T12:00:00Z')),restored=readProfileBackup(backup);expect(restored.buttonTest?.blockId).toBe(restored.items[0].id);expect(restored.categories[0].id).not.toBe(group);expect(restored.translations!.entries[0].categories[restored.categories[0].id]).toBe('Projects');expect(restored.translations!.entries[0].items[restored.items[0].id]).toBe('Website')
})
