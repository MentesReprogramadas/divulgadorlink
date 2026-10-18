import {expect,it} from 'vitest'
import {emptyProfileQuery,profileSearchParams,readProfileSearch} from './profile-search-contract'
it('F18-C05 URL roundtrip preserves Portuguese text and ignores unrelated attribution without creating tracking data',()=>{
 const query={q:'Áudio & educação',categoryId:'00000000-0000-4000-8000-000000000001',cursor:'abc.'+'a'.repeat(43)};expect(readProfileSearch(profileSearchParams(query))).toEqual(query);expect(readProfileSearch(new URLSearchParams('utm_source=fixture&at=future'))).toEqual(emptyProfileQuery())
})
it('F18-C06 duplicated, oversized and malformed values never become a broader query',()=>{
 for(const value of ['q=um&q=dois','categoryId=foreign','cursor=forged','q='+('a'.repeat(101))])expect(()=>readProfileSearch(new URLSearchParams(value))).toThrow()
})
