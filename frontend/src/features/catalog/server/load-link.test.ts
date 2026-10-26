import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadPublicLink } from './load-link'
import { forward } from '@/lib/upstream'

const age=vi.hoisted(()=>({value:undefined as string|undefined}))
vi.mock('next/headers',()=>({headers:async()=>new Headers({host:'tenant-a.localhost:3000'}),cookies:async()=>({get:()=>age.value?{value:age.value}:undefined})}))
vi.mock('@/lib/upstream',()=>({forward:vi.fn(),tenantHost:(host:string)=>host}))
afterEach(()=>{vi.clearAllMocks();age.value=undefined})

describe('contexto de idade do detalhe SSR',()=>{
  it.each(['yes','no'])('repassa somente a escolha válida %s para a projeção do servidor',async(value)=>{
    age.value=value
    vi.mocked(forward).mockResolvedValue({status:200,body:Buffer.from(JSON.stringify({available:true})),headers:{}})
    await loadPublicLink('one')
    expect(forward).toHaveBeenCalledWith(expect.objectContaining({host:'tenant-a.localhost',cookie:`age=${value}`}))
  })
  it('não encaminha valores arbitrários como cookie de permissão',async()=>{
    age.value='admin=true'
    vi.mocked(forward).mockResolvedValue({status:200,body:Buffer.from(JSON.stringify({available:true,ageRequired:true})),headers:{}})
    expect((await loadPublicLink('one')).link?.ageRequired).toBe(true)
    expect(forward).toHaveBeenCalledWith(expect.not.objectContaining({cookie:expect.anything()}))
  })
})
