import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import { getLinksRepository, InMemoryLinksRepository, resetLinksRepositoryForTest } from '@/repositories/links-repository'
import { resetConfigsRepositoryForTest } from '@/repositories/configs-repository'
import { approvedPreview } from '@/domain/catalog/seo-editorial'
const tenantId='seed-temlinkaqui',host='temlinkaqui.com'
const repo=()=>getLinksRepository() as InMemoryLinksRepository
function call(method:'GET'|'PUT',path='',payload?:unknown,sub='admin',role:'ADMIN'|'USER'='ADMIN',tokenTenant=tenantId){return app.inject({method,url:'/api/v1/admin/catalog-seo'+path,headers:{host,authorization:'Bearer '+app.jwt.sign({sub,role,tenantId:tokenTenant,typ:'access'})},...(payload?{payload}:{})})}
beforeAll(async()=>{await app.ready()})
beforeEach(()=>{resetLinksRepositoryForTest();resetConfigsRepositoryForTest();repo().addUser({id:'admin',tenantId,role:'ADMIN',status:'ACTIVE',identifiers:[]})})
describe('admin editorial SEO',()=>{
  it('não aceita papel forjado, conta banida ou outro tenant',async()=>{
    repo().addUser({id:'user',tenantId,role:'USER',status:'ACTIVE',identifiers:[]})
    repo().addUser({id:'banned',tenantId,role:'ADMIN',status:'BANNED',identifiers:[]})
    expect((await call('GET','','','user')).statusCode).toBe(403)
    expect((await call('GET','','','banned')).statusCode).toBe(403)
    expect((await call('GET','','','admin','ADMIN','other')).statusCode).toBe(404)
  })
  it('salva coleções/textos conhecidos, recusa filtro inexistente e revisão velha',async()=>{
    const collection={slug:'apostas-telegram',networkSlug:'telegram',nicheSlug:'apostas',title:'Apostas no Telegram',description:'Comunidades para conversar sobre apostas esportivas.',explicit:false,approved:true}
    const body={expectedVersion:0,facets:{},collections:[collection]}
    expect((await call('PUT','',{...body,collections:[{...collection,networkSlug:'outro-tenant'}]})).statusCode).toBe(400)
    const saved=await call('PUT','',body)
    expect(saved.statusCode).toBe(200)
    expect(saved.json().version).toBe(1)
    expect((await call('PUT','',body)).statusCode).toBe(409)
  })
  it('aprova prévia do link publicado atual e preserva links ao editar coleções',async()=>{
    const link=repo().addLink({id:'adult',tenantId,status:'PUBLISHED',nicheId:'niche-apostas',name:'Nome restrito',description:'Texto restrito'})
    const preview={expectedVersion:0,title:'Comunidade adulta',description:'Apresentação pública aprovada.',explicit:true,approved:true}
    const saved=await call('PUT','/links/adult',preview)
    expect(saved.statusCode).toBe(200)
    expect(approvedPreview(saved.json(),link)?.title).toBe(preview.title)
    const changed=await call('PUT','',{expectedVersion:1,facets:{},collections:[]})
    expect(changed.json().links.adult).toEqual(saved.json().links.adult)
    repo().addLink({id:'draft',tenantId,status:'DRAFT'})
    expect((await call('PUT','/links/draft',{...preview,expectedVersion:2})).statusCode).toBe(404)
    const foreign=repo().addLink({id:'foreign',tenantId:'other',status:'PUBLISHED'})
    expect((await call('GET','/links/'+foreign.id)).statusCode).toBe(404)
  })
  it('marca prévia desatualizada para nova revisão e impede conteúdo explícito sem restrição',async()=>{
    repo().addLink({id:'open',tenantId,status:'PUBLISHED',name:'Comunidade livre'})
    const text={expectedVersion:0,title:'Apresentação pública',description:'Resumo público revisado.',explicit:true,approved:true}
    expect((await call('PUT','/links/open',text)).statusCode).toBe(400)
    expect((await call('PUT','/links/open',{...text,explicit:false})).statusCode).toBe(200)
    repo().links.find(row=>row.id==='open')!.updatedAt=new Date('2026-11-01')
    const stale=await call('GET','/links/open')
    expect(stale.json().preview.approved).toBe(false)
    expect((await call('PUT','',{expectedVersion:1,facets:{'network:telegram':{title:'Telegram',description:'Editorial da rede.',approved:true,explicit:true}},collections:[]})).statusCode).toBe(400)
  })
  it('coleção explícita precisa filtrar conteúdo restrito e não pode ocultar classificação adulta conhecida',async()=>{
    const adult={...repo().niches[0],id:'niche-adult',slug:'adulto',name:'Adulto',requiresAge:true}
    repo().niches.push(adult)
    const collection={slug:'adultos',networkSlug:'telegram',nicheSlug:null,title:'Coleção adulta',description:'Apresentação para maiores de idade.',explicit:true,approved:true}
    expect((await call('PUT','',{expectedVersion:0,facets:{},collections:[collection]})).statusCode).toBe(400)
    expect((await call('PUT','',{expectedVersion:0,facets:{},collections:[{...collection,nicheSlug:'adulto',explicit:false}]})).statusCode).toBe(400)
    expect((await call('PUT','',{expectedVersion:0,facets:{'niche:adulto':{title:'Adulto',description:'Apresentação pública.',explicit:false,approved:true}},collections:[]})).statusCode).toBe(400)
    expect((await call('PUT','',{expectedVersion:0,facets:{},collections:[{...collection,nicheSlug:'adulto'}]})).statusCode).toBe(200)
  })
  it('curadoria não admite ID de outro tenant, não público ou incompatível com o seletor',async()=>{
    repo().addLink({id:'selected',tenantId,status:'PUBLISHED',nicheId:'niche-jogos'})
    repo().addLink({id:'mismatch',tenantId,status:'PUBLISHED',nicheId:'niche-apostas'})
    repo().addLink({id:'foreign',tenantId:'other',status:'PUBLISHED'})
    repo().addLink({id:'draft',tenantId,status:'DRAFT'})
    repo().addUser({id:'owner-banned',tenantId,status:'BANNED',role:'USER',identifiers:[]})
    repo().addLink({id:'banned-link',tenantId,status:'PUBLISHED',ownerId:'owner-banned'})
    const base={slug:'selecionados',title:'Grupos selecionados',description:'Apresentação da seleção.',networkSlug:'telegram',nicheSlug:'jogos',explicit:false,approved:true}
    for(const [id,status] of [['foreign',404],['draft',404],['banned-link',404],['mismatch',400]] as const){
      const response=await call('PUT','',{expectedVersion:0,facets:{},collections:[{...base,linkIds:[id]}]})
      expect(response.statusCode,response.body).toBe(status)
    }
    const saved=await call('PUT','',{expectedVersion:0,facets:{},collections:[{...base,linkIds:['selected']}]})
    expect(saved.statusCode,saved.body).toBe(200)
    expect(saved.json().collections[0].linkIds).toEqual(['selected'])
  })
})
