import {expect,it} from 'vitest'
import {emptyProfile} from './profile-contract'
import {translatedDraft} from './profile-translations'
import {hasUnpublishedProfile} from './profile-diff'
import {readProfileSearch,profileSearchParams} from './profile-search-contract'
it('F39-C01 rascunho traduzido usa fallback e participa do autosave sem alterar destinos',()=>{
 const base={...emptyProfile(),name:'Ana',bio:'Original',categories:[{id:'g',name:'Links',visible:true}],items:[{id:'i',categoryId:'g',label:'Site',destination:'https://example.com',type:'URL' as const,visible:true}]},translated={...base,translations:{primaryLocale:'pt-BR' as const,entries:[{locale:'en' as const,name:'Anna',categories:{},items:{i:'Website'}}]}}
 expect(translatedDraft(translated,'en')).toMatchObject({name:'Anna',bio:'Original',items:[{label:'Website',destination:'https://example.com'}]});expect(hasUnpublishedProfile(translated,base)).toBe(true)
})
it('F39-C02 idioma compõe URL e rejeita valores ambíguos ou desconhecidos',()=>{
 const query=readProfileSearch(new URLSearchParams('locale=en&q=Site'));expect(query.locale).toBe('en');expect(profileSearchParams(query).get('locale')).toBe('en');for(const raw of ['locale=en&locale=es','locale=fr'])expect(()=>readProfileSearch(new URLSearchParams(raw))).toThrow()
})
