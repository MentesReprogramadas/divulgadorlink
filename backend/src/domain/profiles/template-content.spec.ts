import {expect,it} from 'vitest'
import type {ProfileContent} from './profile'
import {applyProfileTemplate,assertProfileExamplesReady,protectTemplateExamples} from './template-content'
const content=():ProfileContent=>({slug:'pagina-real',name:'Pessoa real',bio:'Texto real',avatarAssetId:null,requiresAge:false,primaryItemId:'i',categories:[{id:'g',name:'Grupo real',visible:true}],items:[{id:'i',categoryId:'g',type:'URL',label:'Conteúdo real',destination:'https://example.org/real',visible:true,schedule:{startsAt:null,endsAt:'2026-12-01T00:00:00Z',timeZone:'UTC',paused:false}}]})
const ids=()=>{let value=0;return()=>`00000000-0000-4000-8000-${String(++value).padStart(12,'0')}`}
it('F16-U02/T03 blank structure gets hidden marked examples; fictional identity is never copied or publication-ready',()=>{
  const original={...content(),primaryItemId:null,categories:[],items:[]},result=applyProfileTemplate(original,'creator-v1',true,false,ids())
  expect(result).toMatchObject({name:original.name,bio:original.bio,slug:original.slug,avatarAssetId:null})
  expect(result.items).toHaveLength(3);expect(result.categories).toHaveLength(2);expect(result.items.every(item=>item.templateExample&&!item.visible)).toBe(true);expect(original.items).toEqual([])
  expect(()=>assertProfileExamplesReady({...result,items:result.items.map(item=>({...item,visible:true}))})).toThrow('exemplos')
})
it('F16-U04 preserve mode keeps every group, link, order and schedule; configured replacement requires explicit confirmation',()=>{
  const original=content(),same=structuredClone(original),preserved=applyProfileTemplate(original,'shop-v1',true,false,ids())
  expect(preserved.items).toEqual(original.items);expect(preserved.categories).toEqual(original.categories);expect(preserved.primaryItemId).toBe('i');expect(preserved.appearance).toBeDefined();expect(original).toEqual(same)
  expect(()=>applyProfileTemplate(original,'shop-v1',false,false,ids())).toThrow('confirmação')
  const replaced=applyProfileTemplate(original,'shop-v1',false,true,ids());expect(replaced.items.some(item=>item.id==='i')).toBe(false);expect(replaced.name).toBe(original.name);expect(replaced.primaryItemId).toBeNull()
})
it('F16-U05 marker is server-owned: label/visibility/forged flag cannot release a sample; changing its destination can',()=>{
  const original=applyProfileTemplate({...content(),categories:[],items:[]},'community-v1',true,false,ids()),sample=original.items[0]
  const forged={...original,items:original.items.map(item=>({...item,templateExample:false,visible:true,label:'Nome editado'}))}
  const protectedContent=protectTemplateExamples(original,forged);expect(protectedContent.items[0].templateExample).toBe(true);expect(()=>assertProfileExamplesReady(protectedContent)).toThrow('exemplos')
  const configured=protectTemplateExamples(original,{...original,items:[{...sample,destination:'https://example.org/meu-grupo',visible:true}]});expect(configured.items[0].templateExample).not.toBe(true);expect(()=>assertProfileExamplesReady(configured)).not.toThrow()
  expect(protectTemplateExamples(null,{...content(),items:content().items.map(item=>({...item,templateExample:true}))}).items[0].templateExample).not.toBe(true)
})
it('F16-U06 reapplying in preserve mode does not accumulate groups or change existing configured examples',()=>{
  const first=applyProfileTemplate({...content(),categories:[],items:[]},'event-v1',true,false,ids()),second=applyProfileTemplate(first,'event-v1',true,false,()=>{throw new Error('Unexpected new identifier')})
  expect(second).toEqual(first);expect(second.categories).toHaveLength(2)
})

it('visual templates preserve the owner search preference in preserve and replacement modes',()=>{
 for(const searchEnabled of [false,true]){
  const appearance={background:'#ffffff',buttonColor:'#000000',backgroundStyle:'solid',buttonStyle:'filled',radius:'rounded',font:'modern',alignment:'center',searchEnabled} as const
  for(const preserve of [false,true])expect(applyProfileTemplate({...content(),appearance},'shop-v1',preserve,!preserve,ids()).appearance?.searchEnabled).toBe(searchEnabled)
 }
})
