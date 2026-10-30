import {afterEach,expect,it,vi} from 'vitest'
import {loadCatalog} from '@/lib/catalog-page'
import {loadEarlyAffiliateInvite} from './early-invite'
vi.mock('@/lib/catalog-page',()=>({loadCatalog:vi.fn()}))
afterEach(()=>vi.clearAllMocks())
const input={pathname:'/ofertas/entrar/natal',nonce:'fixture-nonce',personalHost:false,support:false}
it('emite script com nonce somente para convite automático disponível',async()=>{
  vi.mocked(loadCatalog).mockResolvedValue({status:200,body:{available:true,joinMode:'REDIRECT'}})
  const result=await loadEarlyAffiliateInvite(input)
  expect(result?.nonce).toBe('fixture-nonce');expect(result?.script).toContain('natal')
  expect(loadCatalog).toHaveBeenCalledWith('/api/v1/public/affiliates/natal')
  for(const body of [{available:true,joinMode:'SCREEN'},{available:false,joinMode:'REDIRECT'}]) {
    vi.mocked(loadCatalog).mockResolvedValue({status:200,body})
    expect(await loadEarlyAffiliateInvite(input)).toBeNull()
  }
})
it('não inicia transporte em suporte, host pessoal, sem nonce ou outra rota',async()=>{
  for(const other of [{support:true},{personalHost:true},{nonce:null},{pathname:'/admin/afiliados'},{pathname:'/ofertas/entrar/'+ 'a'.repeat(81)},{pathname:'/ofertas/entrar/%3Cscript%3E'}])expect(await loadEarlyAffiliateInvite({...input,...other})).toBeNull()
  expect(loadCatalog).not.toHaveBeenCalled()
})
it('mantém o fluxo React quando a leitura inicial falha',async()=>{
  vi.mocked(loadCatalog).mockRejectedValue(new Error('offline'))
  expect(await loadEarlyAffiliateInvite(input)).toBeNull()
  vi.mocked(loadCatalog).mockResolvedValue({status:404,body:null})
  expect(await loadEarlyAffiliateInvite(input)).toBeNull()
})
