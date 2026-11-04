import { beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { app } from '@/app'
import { prisma } from '@/lib/prisma'
import { InMemoryLinksRepository, getLinksRepository, resetLinksRepositoryForTest } from '@/repositories/links-repository'
import { activeLaunchOffer, dismissLaunchOffer, issueLaunchOffer } from '@/use-cases/@Promotions/launch-offer'

vi.mock('@/use-cases/@Promotions/launch-offer',async(importOriginal)=>({
 ...await importOriginal<typeof import('@/use-cases/@Promotions/launch-offer')>(),
 issueLaunchOffer:vi.fn(),activeLaunchOffer:vi.fn(),dismissLaunchOffer:vi.fn(),prepareAutomaticPublication:vi.fn(),
}))
const tenantId='seed-temlinkaqui',userId='offer-owner',linkId='offer-link'
const campaign={id:'campaign',tenantId,userId,linkId,linkName:'Estudos',prices:[],createdAt:new Date(),expiresAt:new Date(Date.now()+86400000),dismissedAt:null,reservedOrderId:null,productCode:'SEARCH_NICHE' as const,durationDays:14 as const}
beforeAll(async()=>{await app.ready()})
beforeEach(()=>{
 vi.clearAllMocks();resetLinksRepositoryForTest()
 const repo=getLinksRepository() as InMemoryLinksRepository
 repo.addUser({id:userId,tenantId,status:'ACTIVE',identifiers:[{id:'email',kind:'EMAIL',normalizedValue:'offer@test.invalid',confirmedAt:new Date(),replacedAt:null}]})
 repo.addLink({id:linkId,tenantId,ownerId:userId,status:'PUBLISHED',nicheId:'niche-jogos'})
 vi.spyOn(prisma.promotionPrice,'findMany').mockResolvedValue([])
 vi.mocked(issueLaunchOffer).mockResolvedValue(campaign)
 vi.mocked(activeLaunchOffer).mockResolvedValue(campaign)
})
function call(method:'GET'|'POST'|'DELETE',payload?:object,suffix=''){
 return app.inject({method,url:'/api/v1/promotions/launch-offer'+suffix,payload,headers:{host:'temlinkaqui.com',authorization:'Bearer '+app.jwt.sign({sub:userId,tenantId,role:'USER',typ:'access'})}})
}
it('POST aceita fonte exit e seleção e encaminha ao caso de uso sem preço do cliente',async()=>{
 const payload={linkId,source:'exit',productCode:'SEARCH_NICHE',durationDays:14}
 const response=await call('POST',payload)
 expect(response.statusCode).toBe(200)
 expect(issueLaunchOffer).toHaveBeenCalledWith(tenantId,userId,linkId,expect.any(Array),prisma,payload)
 expect(response.json().offer).toMatchObject({productCode:'SEARCH_NICHE',durationDays:14})
 for(const invalid of [{...payload,source:'invalid'},{...payload,durationDays:8},{...payload,productCode:'INVALID'},{...payload,amountCents:1}]) expect((await call('POST',invalid)).statusCode).toBe(400)
})
it('GET mantém campanha ativa dispensada para recuperação persistente no painel',async()=>{
 expect((await call('DELETE',undefined,'/'+campaign.id)).statusCode).toBe(204)
 expect(dismissLaunchOffer).toHaveBeenCalledWith(tenantId,userId,campaign.id)
 vi.mocked(activeLaunchOffer).mockResolvedValue({...campaign,dismissedAt:new Date()})
 const response=await call('GET')
 expect(response.statusCode).toBe(200);expect(response.headers['cache-control']).toBe('private, no-store')
 expect(response.json().offer).toMatchObject({id:campaign.id,dismissed:true,productCode:'SEARCH_NICHE',durationDays:14})
})
it('POST preserva verificação de conta e não emite para outro dono',async()=>{
 const repo=getLinksRepository() as InMemoryLinksRepository
 repo.links.find(link=>link.id===linkId)!.ownerId='other'
 expect((await call('POST',{linkId,source:'exit'})).statusCode).toBe(404)
 repo.users.find(user=>user.id===userId)!.status='BANNED'
 expect((await call('POST',{linkId,source:'exit'})).statusCode).toBe(403)
 expect(issueLaunchOffer).not.toHaveBeenCalled()
})
