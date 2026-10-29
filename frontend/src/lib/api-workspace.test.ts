import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {api,bindApiWorkspace} from './api'
beforeEach(()=>{document.cookie='csrf='+ 'a'.repeat(32)+'; Path=/'})
afterEach(()=>{vi.unstubAllGlobals();bindApiWorkspace(null);document.cookie='csrf=; Path=/; Max-Age=0'})
it('pins the workspace to the original request even if the active space changes during refresh',async()=>{
 let respond!:(response:Response)=>void;const fetcher=vi.fn().mockImplementationOnce(()=>new Promise<Response>(resolve=>{respond=resolve})).mockResolvedValueOnce(new Response('{}',{status:200})).mockResolvedValueOnce(new Response('{"saved":true}',{status:200}));vi.stubGlobal('fetch',fetcher);bindApiWorkspace('original-owner');const result=api('/v1/me/profile',{method:'PATCH',body:'{}'});bindApiWorkspace('next-owner');respond(new Response('{}',{status:401}));await expect(result).resolves.toMatchObject({status:200});expect(new Headers(fetcher.mock.calls[0][1].headers).get('x-workspace-owner')).toBe('original-owner');expect(new Headers(fetcher.mock.calls[2][1].headers).get('x-workspace-owner')).toBe('original-owner')
})
