import {expect,it,vi} from 'vitest'
import {fetchOwnershipFile} from './ownership-fetch'
it('F28-I01 adapter fixa DNS público, bloqueia destino privado e não aceita redirecionamento como evidência',async()=>{
 const connect=vi.fn(async()=>({status:200,headers:new Headers(),body:Buffer.from('proof')}))
 await expect(fetchOwnershipFile('https://example.com/file',{resolve:async()=>['127.0.0.1'],connect})).rejects.toThrow('privado');expect(connect).not.toHaveBeenCalled()
 const redirect=vi.fn(async()=>({status:302,headers:new Headers({location:'https://other.example/file'}),body:Buffer.alloc(0)}))
 await expect(fetchOwnershipFile('https://example.com/file',{resolve:async()=>['93.184.216.34'],connect:redirect})).rejects.toThrow('Redirecionamento');expect(redirect).toHaveBeenCalledTimes(1)
 expect(await fetchOwnershipFile('https://example.com/file',{resolve:async()=>['93.184.216.34'],connect})).toBe('proof');expect(connect).toHaveBeenCalledWith(expect.objectContaining({hostname:'example.com',address:'93.184.216.34',servername:'example.com'}))
})
