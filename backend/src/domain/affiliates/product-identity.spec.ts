import { expect,it } from 'vitest'
import { sameAffiliateProduct,uniqueAffiliateProducts,groupAffiliateProducts } from './product-identity'
it('reconhece anúncios diferentes do mesmo produto, inclusive sufixos comerciais',()=>{
  const base={id:'SHP1',title:"Portátil Caixa De Som Bluetooth Resistente a Água Com Alto Falante Duplo e Luz RGB Caixa De Som Com MD-B01"}
  expect(sameAffiliateProduct(base,{...base,id:'SHP2'})).toBe(true)
  expect(sameAffiliateProduct({id:'one',title:'Areia para Gato Silica EF Pet Areia Sanitaria para Gato'},{id:'two',title:'Areia para Gato Silica EF Pet Areia Sanitaria para Gato - PROMOÇÃO FULL ENVIO RÁPIDO'})).toBe(true)
  expect(sameAffiliateProduct({id:'one',title:'Ração Dog Power frango arroz 3kg'},{id:'two',title:'Ração Dog Power frango arroz 3 kg'})).toBe(true)
  expect(sameAffiliateProduct({id:'one',title:'Árvore de Natal 180cm'},{id:'two',title:'Árvore de Natal 180 cm'})).toBe(true)
  expect(uniqueAffiliateProducts([base,{...base,id:'SHP2'},{...base,id:'SHP3',title:base.title.replace('MD-B01','MD-B02')}])).toHaveLength(2)
  expect(sameAffiliateProduct({id:'one',catalogId:'MLB100',title:'Fone sem fio'},{id:'two',catalogId:'MLB100',title:'Fone Bluetooth'})).toBe(true)
})
it('preserva marcas, modelos, medidas e quantidades que diferenciam a oferta',()=>{
  const product=(title:string)=>({id:title,title})
  for(const [a,b] of [['Ração Dog Power 3 kg','Ração Dog Power 15 kg'],['Kit cabo USB 2 m 3 unidades','Kit cabo USB 3 m 2 unidades'],['Kit ração 2 pacotes 3 kg','Kit ração 3 pacotes 2 kg'],['Fone JBL Tune 510','Fone JBL Tune 520'],['Kit 6 brinquedos para cachorro','Kit 12 brinquedos para cachorro'],['Ração Golden frango arroz 3kg','Ração Dog Power frango arroz 3kg']])expect(sameAffiliateProduct(product(a),product(b))).toBe(false)
})

it('une identidades de catálogo e título de forma consistente e transitiva',()=>{
 const one={id:'MLB1',catalogId:'MLB100',title:'Fone Bluetooth JBL'},two={id:'MLB100',catalogId:'MLB100',title:'Fone JBL'},three={id:'MLB3',catalogId:'MLB3',title:'Fone JBL'}
 expect(sameAffiliateProduct(one,two)).toBe(true);expect(sameAffiliateProduct(two,one)).toBe(true)
 expect(groupAffiliateProducts([one,three,two])).toHaveLength(1)
})
