import {expect,it} from 'vitest'
import {channelNetwork,mergeChannelGroup,projectChannelGroups,type ChannelDestination,type ChannelNetwork,type ChannelSettings} from './profile-channels'
import type {ProfileContent} from './profile'
const content:ProfileContent={slug:'pagina-f37',name:'Comunidade',bio:'',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[{id:'g',name:'Escolha um canal',visible:true},{id:'other',name:'Materiais',visible:true}],items:[{id:'wa',categoryId:'g',type:'URL',label:'Grupo de conversas',destination:'https://chat.whatsapp.com/convite',visible:true},{id:'tg',categoryId:'g',type:'URL',label:'Canal de avisos',destination:'https://t.me/comunidade',visible:true},{id:'other-item',categoryId:'other',type:'URL',label:'Guia',destination:'https://example.com/guia',visible:true}]}
const network:ChannelNetwork={id:'tg-network',tenantId:'a',name:'Telegram',slug:'telegram',knownHosts:['t.me']}
const settings:ChannelSettings={groups:[{id:'g',channels:[{id:'wa',networkId:null,handleId:'hwa',revisionId:'rwa',paused:false},{id:'tg',networkId:network.id,handleId:'htg',revisionId:'rtg',paused:false}]}]}
const sources:ChannelDestination[]=[{id:'rwa',tenantId:'a',ownerId:'owner',handleId:'hwa',activeRevisionId:'rwa',status:'APPROVED',disabled:false,ownerActive:true,destinationUrl:content.items[0].destination,requiresAge:false},{id:'rtg',tenantId:'a',ownerId:'owner',handleId:'htg',activeRevisionId:'rtg',status:'APPROVED',disabled:false,ownerActive:true,destinationUrl:content.items[1].destination,requiresAge:false}]
const scope={tenantId:'a',ownerId:'owner'}
it('F37-U02/T02 network labels are tied to configured hosts, not a typed claim or a deceptive suffix',()=>{
 expect(channelNetwork(network,'https://t.me/comunidade')).toEqual({name:'Telegram',slug:'telegram'})
 expect(()=>channelNetwork(network,'https://t.me.evil.example/comunidade')).toThrow()
 expect(()=>channelNetwork({...network,knownHosts:[]},'https://example.com')).toThrow()
 expect(channelNetwork(null,'https://example.com')).toEqual({name:'Site',slug:'site'})
})
it('F37-U01/T03 paused, replaced, disabled, unapproved, foreign and mismatched destinations never become public choices',()=>{
 const active=projectChannelGroups(content,settings,sources,[network],scope);expect(active[0].channels.map(row=>row.id)).toEqual(['wa','tg'])
 const paused=structuredClone(settings);paused.groups[0].channels[0].paused=true;expect(projectChannelGroups(content,paused,sources,[network],scope)[0].channels.map(row=>row.id)).toEqual(['tg'])
 for(const patch of [{disabled:true},{activeRevisionId:'another'},{status:'PENDING'},{tenantId:'b'},{ownerId:'other'},{ownerActive:false},{destinationUrl:'https://example.org/changed'}]){
  const result=projectChannelGroups(content,settings,[sources[0],{...sources[1],...patch}],[network],scope);expect(result[0].channels.map(row=>row.id)).toEqual(['wa'])
 }
 expect(projectChannelGroups(content,settings,sources,[{...network,tenantId:'b'}],scope)[0].channels.map(row=>row.id)).toEqual(['wa'])
})
it('F37-U03/T06 an empty channel group is explicit and has no destination or inferred equivalence',()=>{
 const result=projectChannelGroups(content,settings,[],[network],scope);expect(result).toEqual([{id:'g',name:'Escolha um canal',channels:[]}]);expect(JSON.stringify(result)).not.toMatch(/https|equivalent/)
})
it('F37-U04 editing or deleting a group preserves unrelated links and stable channel identity without mutating the input',()=>{
 const before=JSON.stringify(content),changed=mergeChannelGroup(content,{id:'g',name:'Canais da comunidade',visible:true,channels:[{id:'tg',label:'Avisos da comunidade',destination:content.items[1].destination,paused:true}]},'g')
 expect(changed.items.find(row=>row.id==='other-item')).toEqual(content.items[2]);expect(changed.items.find(row=>row.id==='tg')).toMatchObject({id:'tg',visible:false,label:'Avisos da comunidade'});expect(changed.items.some(row=>row.id==='wa')).toBe(false);expect(JSON.stringify(content)).toBe(before)
 const deleted=mergeChannelGroup(content,null,'g');expect(deleted.items).toEqual([content.items[2]]);expect(deleted.categories.map(row=>row.id)).toEqual(['other'])
})
