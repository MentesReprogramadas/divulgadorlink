import { describe, expect, it } from 'vitest'
import { discountedLaunchRows, canIssueLaunchOffer, launchOfferIsActive } from './launch-offer'
import { PRICE_ROWS } from './price-for'
describe('oferta pós-cadastro', () => {
 const now = new Date('2026-11-02T12:00:00Z')
 it('calcula vinte por cento em centavos sem alterar a tabela original', () => { const rows=discountedLaunchRows(PRICE_ROWS); expect(rows.find(r=>r.code==='SEARCH_NICHE'&&r.durationDays===7)).toMatchObject({amountCents:1432,referenceAmountCents:1790}); expect(rows.find(r=>r.code==='SEARCH_NICHE_HOME'&&r.durationDays===7)?.amountCents).toBe(2632);expect(PRICE_ROWS[0].amountCents).toBe(790) })
 it('limita a links recentes e ao cooldown da conta', () => {expect(canIssueLaunchOffer(now,now,null)).toBe(true);expect(canIssueLaunchOffer(now,new Date(now.getTime()-86400001),null)).toBe(false);expect(canIssueLaunchOffer(now,now,new Date(now.getTime()-29*86400000))).toBe(false);expect(canIssueLaunchOffer(now,now,new Date(now.getTime()-30*86400000))).toBe(true);expect(canIssueLaunchOffer(now,new Date(now.getTime()+1),null)).toBe(false)})
 it('exit admite idade antiga mantendo prazo futuro inválido e cooldown absoluto de trinta dias',()=>{
  const old=new Date(now.getTime()-90*86400000)
  expect(canIssueLaunchOffer(now,old,null,'exit')).toBe(true)
  expect(canIssueLaunchOffer(now,old,new Date(now.getTime()-30*86400000+1),'exit')).toBe(false)
  expect(canIssueLaunchOffer(now,old,new Date(now.getTime()-30*86400000),'exit')).toBe(true)
  expect(canIssueLaunchOffer(now,new Date(now.getTime()+1),null,'exit')).toBe(false)
 })
 it('encerra na hora exata do vencimento',()=>{expect(launchOfferIsActive({expiresAt:now},now)).toBe(false);expect(launchOfferIsActive({expiresAt:new Date(now.getTime()+1)},now)).toBe(true)})
})
