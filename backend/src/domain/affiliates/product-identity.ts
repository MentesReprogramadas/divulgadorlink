import type { CatalogProduct } from './mercado-livre'

const words=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/(\d)(cm|mm|kg|mg|ml|gb|tb|mah|ghz|mhz|hz|m|g|l|w|v|unidades?|pecas?|pacotes?|leds?|galhos?)\b/g,'$1 $2').replace(/\b(?:envio|postagem)\s*(?:em\s*)?\d+\s*(?:h|horas?|dias?)\b/g,' ').replace(/\b(?:promocao|oferta|full|envio rapido|envio imediato|pronta entrega|lancamento|frete gratis)\b/g,' ').match(/[a-z0-9]+/g)??[]
const titleKey=(title:string)=>{
  const tokens=words(title),units=new Set('cm mm m kg mg g ml l w v gb tb mah ghz mhz hz un unidade unidades peca pecas pacote pacotes galho galhos led leds'.split(' '))
  const measures=tokens.flatMap((word,i)=>/^\d+$/.test(word)&&units.has(tokens[i+1])?[word+':'+tokens[i+1]]:[])
  if(!tokens.length)return ''
  return [...new Set(tokens.filter(w=>!['de','do','da','dos','das','para','com','e','o','a','os','as'].includes(w)))].sort().join(' ')+'|'+[...new Set(measures)].sort().join(' ')
}
export type ProductIdentity=Pick<CatalogProduct,'id'|'title'> & {catalogId?:string}
const keys=(p:ProductIdentity)=>['id:'+p.id,...(p.catalogId?['catalog:'+p.catalogId]:[]),...(titleKey(p.title)?['title:'+titleKey(p.title)]:[])]
export function sameAffiliateProduct(a:ProductIdentity,b:ProductIdentity){
  return a.id===b.id||!!(a.catalogId&&a.catalogId===b.catalogId)||!!titleKey(a.title)&&titleKey(a.title)===titleKey(b.title)
}
export function groupAffiliateProducts<T extends ProductIdentity>(products:T[]):T[][]{
  const groups=new Set<T[]>(),index=new Map<string,T[]>()
  for(const product of products){
    const identities=keys(product),matching=[...new Set(identities.flatMap(key=>index.get(key)?[index.get(key)!]:[]))]
    const group=matching[0]??[]
    for(const other of matching.slice(1)){group.push(...other);groups.delete(other);for(const member of other)for(const key of keys(member))index.set(key,group)}
    group.push(product);groups.add(group)
    for(const key of identities)index.set(key,group)
  }
  return [...groups]
}
export const uniqueAffiliateProducts=<T extends ProductIdentity>(products:T[])=>groupAffiliateProducts(products).map(group=>group[0])
