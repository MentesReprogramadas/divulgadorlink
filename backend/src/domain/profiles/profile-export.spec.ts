import {expect,it} from 'vitest'
import {buildProfileExport} from './profile-export'
const group='11111111-1111-4111-8111-111111111111'
const item='22222222-2222-4222-8222-222222222222'
const content={slug:'pagina-ana',name:'Ana ☀',bio:'Ação e ciência',avatarAssetId:'a'.repeat(64),requiresAge:false,primaryItemId:null,categories:[{id:group,name:'Ciência',visible:true}],items:[{id:item,categoryId:group,type:'URL' as const,label:'Ciência',destination:'https://example.com',visible:true}]}
it('F38-U01/U03/T02 preserves Unicode, structure and order with an explicit schema',()=>{
 const result=buildProfileExport(content,'draft',new Date('2026-10-19T12:00:00Z'))
 expect(result.schemaVersion).toBe(1);expect(result.profile.name).toBe('Ana ☀');expect(result.categories).toEqual(content.categories);expect(result.items).toEqual(content.items)
 expect(result.exportedAt).toBe('2026-10-19T12:00:00.000Z')
})
it('F38-U02/T03 excludes unknown properties, assets and credentials through allowlists',()=>{
 const result=buildProfileExport(Object.assign({...content,appearance:undefined},{password:'PRIVATE',billing:{secret:'PRIVATE'}}),'draft',new Date())
 expect(JSON.stringify(result)).not.toMatch(/PRIVATE|avatarAssetId|password|billing/)
 expect(result.assetsManifest).toEqual([{kind:'avatar',included:false,reason:'Arquivos de imagem não são incluídos.'}])
})
it('F38-U04/T04/T05 explains omissions without publishing automatically',()=>{
 const result=buildProfileExport({...content,avatarAssetId:null},'published',new Date())
 expect(result.assetsManifest).toEqual([]);expect(result.omissions.join(' ')).toContain('não publica automaticamente');expect(result.revision).toBe('published')
})

it('F38-U02 secret-bearing destinations are excluded without leaving a broken primary item',()=>{
 for(const destination of ['https://user:PRIVATE@example.com','https://example.com/?api_key=PRIVATE','https://example.com/?access_token=PRIVATE']){
 const result=buildProfileExport({...content,primaryItemId:item,items:[{...content.items[0],destination}]},'draft',new Date())
 expect(result.items).toEqual([]);expect(result.profile.primaryItemId).toBeNull();expect(JSON.stringify(result)).not.toContain('PRIVATE');expect(result.omissions[0]).toContain('1 link(s)')
 }
})

it('F38-T02/U02 preserves channel presentation and pause settings without internal source bindings',()=>{
 const value=buildProfileExport(content,'draft',new Date(),{groups:[{id:group,channels:[{id:item,handleId:'PRIVATE-HANDLE',revisionId:'PRIVATE-REVISION',networkId:'PRIVATE-NETWORK',paused:true,showLabel:false}]}]})
 expect(value.channelGroups).toEqual([{id:group,channels:[{id:item,paused:true,showLabel:false}]}]);expect(JSON.stringify(value)).not.toContain('PRIVATE-')
})
