import { expect,it } from 'vitest'
import { affiliateProductFitsSegment,petSearchTerm,christmasProductKind,affiliateCopyContext } from './segment-relevance'
import { planAffiliateDiscoveryTerms } from './discovery-terms'
const pets={name:'Pets'}
it('exclui os produtos infantis do lote real sem confundir mordedores e brinquedos de animais',()=>{
  for(const title of ['Chocalho multifuncional para bebês e brinquedo para morder','Brinquedo de Dentição Manhattan Ball Baby - Silicone','Brinquedo de dentição de silicone Manhattan, seguro para morder','Brinquedo Interativo Polvo Dançarino Luz Música Movimento','Brinquedo de pelúcia de panda realista abraçando bambu','Brinquedo de pelúcia infantil de policial labrador','Mordedor de Cogumelo Mini 0-46 Meses','Ração humana'])expect(affiliateProductFitsSegment(pets,title),title).toBe(false)
  for(const title of ['Bola De Brinquedo Para Cachorro Savana Pet 5cm','Mordedor de borracha para cães','Sachê De Ração Úmida Para Gato Adulto Ovelha 85g Gran Plus','Areia higiênica biodegradável','Ração para filhotes','Ração para gatos filhotes de 1 a 12 meses','Ração para cães a partir de 2 meses','Brinquedo para gatos'])expect(affiliateProductFitsSegment(pets,title),title).toBe(true)
  expect(affiliateProductFitsSegment({name:'Natal'},'Chocalho para bebês')).toBe(true)
})
it('mantém o contexto pet na expansão e deduplica termos depois da qualificação',()=>{
  const terms=planAffiliateDiscoveryTerms(['Brinquedo para cachorro'],['brinquedo interativo','brinquedo de borracha','brinquedo para morder'],'Pets')
  expect(terms).toContain('brinquedo interativo para pets')
  expect(terms).not.toContain('brinquedo interativo')
  expect(petSearchTerm('areia de sílica')).toBe('areia de sílica para gatos')
})

it('presentes genéricos com Natal no SEO não se tornam decoração natalina',()=>{
 for(const title of ['Fone Bluetooth presente de Natal','Tênis feminino presente Natal','Caixa de som Bluetooth para o Natal'])expect(christmasProductKind(title)).toBe('GIFT')
 for(const title of ['Guirlanda Natalina','Caneca decorada de Natal','Caixa de presente de Natal','Enfeite de árvore de Natal'])expect(christmasProductKind(title)).toBe('THEME')
 expect(affiliateProductFitsSegment({name:'Pets'},'Brinquedo de pelúcia de papagaio pássaro')).toBe(false)
 expect(affiliateProductFitsSegment({name:'Pets'},'Brinquedo de pelúcia para gatos')).toBe(true)
})

it('preserva a relação complementar explícita em vez de forçar presente de Natal',()=>{
 expect(affiliateCopyContext({name:'Natal',planContext:{role:'RELATED',framing:'COMPANION',reason:'Preparo da ceia de Natal.'}},'Panela de pressão').purpose).toBe('COMPANION')
})
