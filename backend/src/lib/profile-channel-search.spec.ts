import {expect,it} from 'vitest'
import {profileItemSearchPage} from './profile-item-search-page'
import type {ProfileContent} from '@/domain/profiles/profile'
const content:ProfileContent={slug:'pagina',name:'Minha página',bio:'',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[{id:'g',name:'Canais',visible:true}],items:[{id:'site',categoryId:'g',type:'URL',label:'Meu site',destination:'https://example.com',visible:true},{id:'tg',categoryId:'g',type:'URL',label:'Avisos',destination:'https://t.me/canal',visible:true}]}
const groups=[{id:'g',name:'Canais',channels:[{id:'site',label:'Meu site',network:{name:'Site',slug:'site'},href:'/p/pagina/canais/site?token=fixture'},{id:'tg',label:'Avisos',network:{name:'Telegram',slug:'telegram'},href:'/p/pagina/canais/tg?token=fixture'},{id:'hidden',label:'F37-HIDDEN-SECRET',network:{name:'Telegram',slug:'telegram'},href:'https://secret.example/draft'}]}]
it('F37-U06/T03 F18 filtering selects channel metadata with the same item IDs and never resurrects hidden choices',()=>{
 const result=profileItemSearchPage({...content,restricted:false,publishedRevisionId:1,channelGroups:groups},'fixture',{q:'Meu site',categoryId:null},null,'fixture-secret');if(result.restricted)throw new Error('Unexpected restriction')
 expect(result.channelGroups?.[0].channels.map(channel=>channel.id)).toEqual(['site']);expect(JSON.stringify(result)).not.toMatch(/HIDDEN-SECRET|secret.example|token=fixture.*tg/)
})
it('F37-U07 an explicit empty block is retained on the unfiltered first page but is not an invented search result',()=>{
 const projected={...content,items:[],restricted:false as const,publishedRevisionId:1,channelGroups:[{id:'g',name:'Canais',channels:[]}]}
 const empty=profileItemSearchPage(projected,'fixture',{q:'',categoryId:null},null,'fixture-secret');if(empty.restricted)throw new Error('Unexpected restriction');expect(empty.categories.map(group=>group.id)).toEqual(['g']);expect(empty.channelGroups).toEqual(projected.channelGroups);expect(empty.search.total).toBe(0)
 const query=profileItemSearchPage(projected,'fixture',{q:'inexistente',categoryId:null},null,'fixture-secret');if(query.restricted)throw new Error('Unexpected restriction');expect(query.channelGroups).toEqual([])
})
