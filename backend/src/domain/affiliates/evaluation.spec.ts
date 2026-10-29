import {describe,it,expect} from 'vitest'
import {evaluateAffiliateProduct} from './evaluation'
import type {CatalogProduct} from './mercado-livre'
const now=new Date('2026-10-28T15:00:00Z')
const product:CatalogProduct={id:'MLB1',catalogId:'MLB2',title:'Produto',productUrl:'https://www.mercadolivre.com.br/p/MLB2?wid=MLB1',priceCents:900,oldPriceCents:null,imageUrl:null,checkedAt:now.toISOString(),reputation:{level:'5_green',status:'GREEN'}}
const history=[25,26,27].map(day=>({day:new Date(`2026-10-${day}T00:00:00Z`),priceCents:1000}))
describe('evidence policy v1',()=>{
  it('selects verified ML discount only with green reputation',()=>{
    const value={...product,oldPriceCents:1000,oldPriceSource:'MERCADO_LIVRE' as const}
    expect(evaluateAffiliateProduct(value,[],now)).toMatchObject({status:'SELECTED',reportedDiscountPercent:10,history:{verified:false,days:0}})
    expect(evaluateAffiliateProduct({...value,reputation:undefined},[],now).status).toBe('REVIEW')
    expect(evaluateAffiliateProduct({...value,reputation:{level:'3_yellow',status:'POOR'}},[],now).status).toBe('DISCARDED')
  })
  it('requires 3 real previous distinct days and excludes current/future/stale data',()=>{
    expect(evaluateAffiliateProduct(product,history.slice(0,2),now).status).toBe('REVIEW')
    const evaluation=evaluateAffiliateProduct(product,[...history,...history,{day:now,priceCents:2000},{day:new Date('2026-10-29'),priceCents:2000},{day:new Date('2026-09-01'),priceCents:2000}],now)
    expect(evaluation).toMatchObject({status:'SELECTED',history:{days:3,medianPriceCents:1000,dropPercent:10,verified:true}})
    expect(product.oldPriceCents).toBeNull()
  })
  it('never accepts an unsourced old price or negligible drop',()=>{
    expect(evaluateAffiliateProduct({...product,oldPriceCents:2000},[],now).status).toBe('REVIEW')
    expect(evaluateAffiliateProduct({...product,priceCents:990},history,now).status).toBe('REVIEW')
  })
})
