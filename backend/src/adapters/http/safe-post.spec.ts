import {expect,it,vi} from 'vitest'
import {safePost} from './safe-fetch'
it('F30-T06 fixa DNS e POST, recusa rebinding e não segue redirecionamentos',async()=>{
 const connect=vi.fn(async()=>({status:204,headers:new Headers(),body:new Uint8Array()}))
 expect(await safePost('https://receiver.example/hooks','{}',{'x-signature':'secret'},async()=>['93.184.216.34'],connect)).toBe(204)
 expect(connect.mock.calls[0]).toEqual([{url:'https://receiver.example/hooks',hostname:'receiver.example',address:'93.184.216.34',servername:'receiver.example'},{body:'{}',headers:{'x-signature':'secret','content-type':'application/json','content-length':'2'}}])
 await expect(safePost('https://receiver.example/hooks','{}',{},async()=>['127.0.0.1'],connect)).rejects.toThrow();expect(connect).toHaveBeenCalledTimes(1)
 for(const address of ['fe90::1','febf::1','64:ff9b::7f00:1','::1','fc00::1'])await expect(safePost('https://receiver.example/hooks','{}',{},async()=>[address],connect)).rejects.toThrow()
 const redirect=vi.fn(async()=>({status:302,headers:new Headers({location:'http://127.0.0.1'}),body:new Uint8Array()}));await expect(safePost('https://receiver.example','{}',{},async()=>['93.184.216.34'],redirect)).rejects.toThrow('redirect');expect(redirect).toHaveBeenCalledTimes(1)
})
