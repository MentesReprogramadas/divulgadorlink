import {expect,it} from 'vitest'
import {profileAt,type ProfileContent} from './profile'
import {profileItemPage} from './profile-item-search'
const content=():ProfileContent=>({slug:'pagina-real',name:'Nome que não é pesquisável',bio:'Dado fora do escopo',avatarAssetId:null,requiresAge:false,primaryItemId:'last',categories:[{id:'g',name:'Educação',visible:true},{id:'b',name:'Projetos',visible:true}],items:[{id:'first',categoryId:'g',type:'URL',label:'Áudio de curso',destination:'https://example.com/curso',visible:true},{id:'hidden',categoryId:'g',type:'URL',label:'SENTINELA OCULTA',destination:'https://example.com/hidden',visible:false},{id:'future',categoryId:'g',type:'URL',label:'SENTINELA FUTURA',destination:'https://example.com/future',visible:true,schedule:{startsAt:'2026-12-01T00:00:00Z',endsAt:null,timeZone:'UTC',paused:false}},{id:'last',categoryId:'b',type:'URL',label:'Meu portfólio',destination:'https://example.com/projeto',visible:true}]})
const projected=()=>profileAt(content(),new Set(),new Date('2026-10-18T12:00:00Z'),true).content
it('F18-U01/T01/T02 title and group search uses the actual public projection and normalized conjunction, never draft/private data',()=>{
 const publicContent=projected();expect(profileItemPage(publicContent,{q:'  AUDIO   educacao ',categoryId:null}).items.map(item=>item.id)).toEqual(['first'])
 for(const q of ['SENTINELA','hidden','Dado fora do escopo','Nome que não é pesquisável','https://example.com'])expect(profileItemPage(publicContent,{q,categoryId:null}).items).toEqual([])
 expect(publicContent.items).toHaveLength(2)
})
it('F18-U02 unknown category never widens scope and category+text are combined',()=>{
 expect(profileItemPage(projected(),{q:'',categoryId:'foreign'}).items).toEqual([]);expect(profileItemPage(projected(),{q:'audio',categoryId:'b'}).items).toEqual([]);expect(profileItemPage(projected(),{q:'audio',categoryId:'g'}).items).toHaveLength(1)
})
it('F18-U03 pages of twenty follow primary/group/item order without repetition or mutation',()=>{
 const value=projected(),before=structuredClone(value);value.items.push(...Array.from({length:43},(_,index)=>({id:'extra-'+index,categoryId:'g',type:'URL' as const,label:'Material '+index,destination:'https://example.org/'+index,visible:true})));const full=structuredClone(value),ids:string[]=[];let offset:number|null=0
 while(offset!==null){const page=profileItemPage(value,{q:'',categoryId:null},offset);ids.push(...page.items.map(item=>item.id));offset=page.nextOffset}
 expect(ids[0]).toBe('last');expect(ids.slice(1,3)).toEqual(['first','extra-0']);expect(new Set(ids).size).toBe(45);expect(ids).toHaveLength(45);expect(value).toEqual(full);expect(before.items).toHaveLength(2)
})
