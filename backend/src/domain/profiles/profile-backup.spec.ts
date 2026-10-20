import {expect,it} from 'vitest'
import {buildProfileExport} from './profile-export'
import {readProfileBackup} from './profile-backup'
const group='11111111-1111-4111-8111-111111111111',item='22222222-2222-4222-8222-222222222222'
const content={slug:'pagina-ana',name:'Ana ☀',bio:'Ação e ciência',avatarAssetId:'a'.repeat(64),requiresAge:false,primaryItemId:item,categories:[{id:group,name:'Ciência',visible:true}],items:[{id:item,categoryId:group,type:'URL' as const,label:'Ciência',destination:'https://example.com',visible:true}]}
it('export/import preserves Unicode, content and references while rebuilding IDs and clearing photos',()=>{
 const imported=readProfileBackup(buildProfileExport(content,'published',new Date()),'meu-endereco')
 expect(imported.slug).toBe('meu-endereco');expect(imported.name).toBe('Ana ☀');expect(imported.avatarAssetId).toBeNull();expect(imported.categories[0].id).not.toBe(group);expect(imported.items[0].id).not.toBe(item);expect(imported.items[0].categoryId).toBe(imported.categories[0].id);expect(imported.primaryItemId).toBe(imported.items[0].id)
})
it('rejects unknown schemas, injected privileges, invalid relations and duplicate IDs before saving',()=>{
 const valid=buildProfileExport(content,'draft',new Date())
 for(const value of [{...valid,schemaVersion:2},{...valid,permissions:{all:true}},{...valid,profile:{...valid.profile,ownerId:'victim'}},{...valid,categories:[]},{...valid,items:[...valid.items,...valid.items]}])expect(()=>readProfileBackup(value)).toThrow()
})
