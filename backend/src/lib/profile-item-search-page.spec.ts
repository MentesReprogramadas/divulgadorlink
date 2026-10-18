import {expect,it} from 'vitest'
import {profileItemSearchPage} from './profile-item-search-page'
import type {ProfileContent} from '@/domain/profiles/profile'
const profile=():ProfileContent&{restricted:false;publishedRevisionId:number}=>({restricted:false,publishedRevisionId:3,slug:'pagina',name:'Página',bio:'',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[{id:'g',name:'Materiais',visible:true}],items:Array.from({length:43},(_,i)=>({id:String(i),categoryId:'g',type:'URL',label:'Material '+i,destination:'https://example.org/'+i,visible:true}))})
const filters={q:'',categoryId:null},secret='local-cursor-unit-test-secret'
it('F18-U04 cursor binds tenant/page/query/version/public eligibility, does not depend on wall-clock and has no repeated IDs',()=>{
 const first=profileItemSearchPage(profile(),'tenant-a/public/pagina',filters,null,secret);if(first.restricted)throw new Error('Unexpected gate');expect(first.items).toHaveLength(20);expect(first.search.nextCursor).toBeTruthy()
 const second=profileItemSearchPage(profile(),'tenant-a/public/pagina',filters,first.search.nextCursor,secret);if(second.restricted)throw new Error('Unexpected gate');expect(second.items[0].id).toBe('20');expect(new Set([...first.items,...second.items].map(item=>item.id)).size).toBe(40)
 for(const context of ['tenant-b/public/pagina','tenant-a/public/outra','tenant-a/preview/pagina'])expect(()=>profileItemSearchPage(profile(),context,filters,first.search.nextCursor,secret)).toThrow('resultados mudaram')
 expect(()=>profileItemSearchPage(profile(),'tenant-a/public/pagina',{q:'Material',categoryId:null},first.search.nextCursor,secret)).toThrow('resultados mudaram')
 expect(()=>profileItemSearchPage({...profile(),publishedRevisionId:4},'tenant-a/public/pagina',filters,first.search.nextCursor,secret)).toThrow('resultados mudaram')
 expect(()=>profileItemSearchPage({...profile(),items:profile().items.slice(1)},'tenant-a/public/pagina',filters,first.search.nextCursor,secret)).toThrow('resultados mudaram')
 expect(()=>profileItemSearchPage(profile(),'tenant-a/public/pagina',filters,first.search.nextCursor!+'x',secret)).toThrow('não é válida')
})
it('F18-U05 age-gated projection reveals no results, categories, count or cursor metadata',()=>{
 expect(profileItemSearchPage({restricted:true},'tenant-a/public/pagina',filters,'forged',secret)).toEqual({restricted:true})
})
