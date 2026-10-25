import {expect,it,vi} from 'vitest'
import {fetchOwnershipFile,resolveOwnershipTxt} from './ownership-fetch'
it('a consulta HTTPS usada pelos endereços próprios continua bloqueando rede privada e redirecionamentos',async()=>{
 const connect=vi.fn(async()=>({status:200,headers:new Headers(),body:Buffer.from('proof')}))
 await expect(fetchOwnershipFile('https://example.com/file',{resolve:async()=>['127.0.0.1'],connect})).rejects.toThrow('privado');expect(connect).not.toHaveBeenCalled()
 const redirect=vi.fn(async()=>({status:302,headers:new Headers({location:'https://other.example/file'}),body:Buffer.alloc(0)}))
 await expect(fetchOwnershipFile('https://example.com/file',{resolve:async()=>['93.184.216.34'],connect:redirect})).rejects.toThrow('Redirecionamento')
 expect(await fetchOwnershipFile('https://example.com/file',{resolve:async()=>['93.184.216.34'],connect})).toBe('proof')
})
it('consulta TXT, une segmentos do mesmo registro e preserva registros separados',async()=>{
 const resolver=vi.fn().mockResolvedValue([['a'.repeat(32),'b'.repeat(32)],['outro']])
 expect(await resolveOwnershipTxt('_temlinkaqui-verification.example.com',resolver)).toEqual(['a'.repeat(32)+'b'.repeat(32),'outro'])
 expect(resolver).toHaveBeenCalledWith('_temlinkaqui-verification.example.com')
})
it('ausência de TXT não comprova; falhas do resolvedor continuam recuperáveis',async()=>{
 await expect(resolveOwnershipTxt('example.com',vi.fn().mockRejectedValue(Object.assign(new Error(),{code:'ENODATA'})))).resolves.toEqual([])
 await expect(resolveOwnershipTxt('example.com',vi.fn().mockRejectedValue(new Error('offline')))).rejects.toThrow('offline')
})
