import {expect,it} from 'vitest'
import {selectDigestLinks} from './niche-digest'
const row={id:'link-a',tenantId:'tenant-a',nicheId:'niche-a',status:'PUBLISHED',requiresAge:false,ownerActive:true}
const preferences={enabled:true,active:true,tenantId:'tenant-a',followed:new Set(['niche-a']),seen:new Set<string>()}
it('F05-U01 empty periods produce no email items',()=>expect(selectDigestLinks([],preferences)).toEqual([]))
it('F05-U02/T03 an already received link is not repeated',()=>expect(selectDigestLinks([row],{...preferences,seen:new Set([row.id])})).toEqual([]))
it('F05-U03/T01/T02 disabling or unfollowing suppresses all selected items',()=>{expect(selectDigestLinks([row],{...preferences,enabled:false})).toEqual([]);expect(selectDigestLinks([row],{...preferences,followed:new Set()})).toEqual([])})
it('F05-U04/T04/T05 rechecks publication, age, tenant and owner status',()=>{
 expect(selectDigestLinks([row],preferences)).toEqual([row]);for(const patch of [{status:'UNAVAILABLE'},{requiresAge:true},{tenantId:'tenant-b'},{ownerActive:false}])expect(selectDigestLinks([{...row,...patch}],preferences)).toEqual([])
})
