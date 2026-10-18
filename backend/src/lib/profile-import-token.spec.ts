import {expect,it} from 'vitest'
import {readProfileImport,signProfileImport} from './profile-import-token'
const actor={tenantId:'tenant-a',ownerId:'owner-a'},ticket={...actor,version:1,key:'00000000-0000-4000-8000-000000000001',expiresAt:123,lines:['https://example.com/a']}
it('F17 token binds source/version/key to the exact owner and tenant, rejects tampering and oversized inputs',()=>{
 const token=signProfileImport(ticket);expect(readProfileImport(token,actor)).toEqual(ticket)
 for(const invalid of [token+'x',token.replace(token[0],token[0]==='a'?'b':'a'),'x'.repeat(160001)])expect(()=>readProfileImport(invalid,actor)).toThrow('revisão')
 expect(()=>readProfileImport(token,{...actor,ownerId:'other'})).toThrow();expect(()=>readProfileImport(token,{...actor,tenantId:'b'})).toThrow()
})
