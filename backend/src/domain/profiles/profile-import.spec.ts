import {expect,it} from 'vitest'
import type {ProfileContent} from './profile'
import {previewProfileImport,planProfileImport} from './profile-import'
const original=():ProfileContent=>({slug:'pagina-real',name:'Pessoa',bio:'Minha página',avatarAssetId:null,requiresAge:false,primaryItemId:'old',categories:[{id:'g',name:'Meus links',visible:true}],items:[{id:'old',categoryId:'g',type:'URL',label:'Antigo',destination:'https://example.org/antigo',visible:true,schedule:{startsAt:null,endsAt:null,timeZone:'UTC',paused:true}}]})
it('F17-U01/T01/T02 mixed lines keep exact line numbers and individual invalid/duplicate reasons without network',()=>{
 const result=previewProfileImport(['https://EXAMPLE.com/novo/?utm_source=teste#x','','https://example.com/novo','javascript:alert(1)','https://127.0.0.1/a','https://user:pass@example.com/a','http://example.com/a','https://example.com:444/a'],original())
 expect(result.map(item=>[item.line,item.status])).toEqual([[1,'READY'],[3,'DUPLICATE'],[4,'INVALID'],[5,'INVALID'],[6,'INVALID'],[7,'INVALID'],[8,'INVALID']]);expect(result[0].url).toBe('https://example.com/novo');expect(result[0].suggestedTitle).toBe('example.com');expect(result.slice(1).every(item=>item.message)).toBe(true)
})
it('F17-U02 canonicalization matches existing real destinations but ignores hidden template examples',()=>{
 const current=original();current.items.push({...current.items[0],id:'example',destination:'https://example.com/modelo',templateExample:true,visible:false})
 const result=previewProfileImport(['https://example.org/antigo/?fbclid=abc','https://example.com/modelo'],current);expect(result.map(item=>item.status)).toEqual(['DUPLICATE','READY']);expect(()=>previewProfileImport(Array(51).fill('https://example.com'),current)).toThrow('50');expect(()=>previewProfileImport(['x'.repeat(2049)],current)).toThrow('2048')
})
it('F17-U03/T03/T04/T05 revised selection appends only to draft, retains all old fields/schedules and shares a newly named group',()=>{
 const current=original(),before=structuredClone(current),lines=previewProfileImport(['https://example.com/um','https://example.com/dois','inválido'],current);let id=0
 const result=planProfileImport(current,lines,[{line:1,label:'Meu primeiro link',categoryId:null,newCategoryName:'Importados'},{line:2,label:'Segundo',categoryId:null,newCategoryName:'Importados'}],()=>`new-${++id}`)
 expect(current).toEqual(before);expect(result.content.items[0]).toEqual(before.items[0]);expect(result.createdIds).toHaveLength(2);expect(result.content.categories).toHaveLength(2);expect(result.content.items.slice(1).every(item=>item.categoryId===result.content.categories[1].id&&item.visible&&item.type==='URL'&&!item.templateExample&&!item.schedule)).toBe(true);expect(result.content.items[1].label).toBe('Meu primeiro link');expect(result.content).toMatchObject({name:before.name,slug:before.slug,primaryItemId:before.primaryItemId})
})
it('F17-U04 invalid, repeated, forged selection, unknown category and page caps fail before partial mutation',()=>{
 const current=original(),lines=previewProfileImport(['https://example.com/um','inválido'],current),choice={line:1,label:'Link',categoryId:'g',newCategoryName:null};let calls=0;const id=()=>`new-${++calls}`
 for(const selections of [[],[{...choice,line:2}],[choice,choice],[{...choice,line:9}],[{...choice,categoryId:'foreign'}],[{...choice,label:' '}],[{...choice,newCategoryName:'Ambíguo'}]])expect(()=>planProfileImport(current,lines,selections,id)).toThrow()
 const full={...current,items:Array.from({length:500},(_,i)=>({...current.items[0],id:String(i)}))};expect(()=>planProfileImport(full,lines,[choice],id)).toThrow('500');expect(current.items).toHaveLength(1)
})
it('F17-U05 encoded URL size is bounded per line and group caps are preserved',()=>{
 const current=original(),line='https://example.com/'+encodeURI('é'.repeat(340));expect(line.length).toBeGreaterThan(2048)
 const result=previewProfileImport(['https://example.com/'+'é'.repeat(340)],current);expect(result[0]).toMatchObject({status:'INVALID',url:null});expect(result[0].message).toContain('2048')
 const full={...current,categories:Array.from({length:100},(_,i)=>({...current.categories[0],id:'g'+i}))},lines=previewProfileImport(['https://example.com/novo'],full)
 expect(()=>planProfileImport(full,lines,[{line:1,label:'Novo',categoryId:null,newCategoryName:'Outro'}],()=> 'new')).toThrow('100')
})
