const normalize=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('pt-BR')
const pets=/\b(?:pets?|cachorros?|caes|cao|gatos?|felinos?|caninos?|dogs?|cats?|hamsters?|roedores?|passaros?|coelhos?|aquarios?|antipulgas?|veterinari[oa]s?|petiscos?|arranhadores?)\b/
const petCategory=/\bracao\b|\bareia\b.*\b(?:higienica|aglomerante|silica|biodegradavel)\b/
const children=/\b(?:bebes?|baby|babies|infantis|infantil|criancas?|chocalhos?|manhattan|pediatrico|recem nascid[oa])\b/
export type AffiliatePlanContext={role:'CORE'|'RELATED';framing:'THEME'|'GIFT'|'COMPANION';reason:string}
export type AffiliateSegmentTheme={name:string;discovery?:{terms:string[]}|null;planContext?:AffiliatePlanContext}
export function isPetSegment(segment:AffiliateSegmentTheme){
  const name=normalize(segment.name),terms=segment.discovery?.terms??[]
  return pets.test(name)||/animais(?: de estimacao)?/.test(name)||terms.length>0&&terms.every(term=>pets.test(normalize(term))||petCategory.test(normalize(term)))
}
export function affiliateProductFitsSegment(segment:AffiliateSegmentTheme,title:string){
  if(!isPetSegment(segment))return true
  const text=normalize(title)
  return !children.test(text)&&!text.includes('racao humana')&&(!/\b(?:pelucia|boneco)\b/.test(text)||/\bpara (?:o |os |seu |seus )?(?:gatos?|cachorros?|caes|cao|pets?|animais)\b/.test(text))&&(pets.test(text)||petCategory.test(text))
}
export function petSearchTerm(term:string){
  if(pets.test(normalize(term)))return term
  return `${term.slice(0,100).trim()} para ${/areia/.test(normalize(term))?'gatos':'pets'}`
}

export function isChristmasSegment(segment:AffiliateSegmentTheme){
  return /\b(?:natal|natalino|natalina|christmas|xmas)\b/.test(normalize(segment.name))
}
export function christmasProductKind(title:string):'THEME'|'GIFT'|'OUTSIDE'{
  const text=normalize(title)
  if(/\b(?:racao|areia|medicamento|parafuso|automotivo|suplemento|antipulga)\b/.test(text))return 'OUTSIDE'
  if(/\b(?:fones?|tenis|smartwatch|relogio|perfume|console|smartphone|celular|tablet|ipad|notebook)\b|\bcaixa de som\b/.test(text))return 'GIFT'
  if(/\b(?:natal|natalinos?|natalinas?|christmas|xmas|noel)\b|\bpisca[ -]pisca\b/.test(text))return 'THEME'
  return /\b(?:fone|fones|tenis|relogio|smartwatch|perfume|caneca|console|jogo|jogos|livro|bolsa|carteira|mochila|panela|panelas|brinquedo)\b|\bcaixa de som\b/.test(text)?'GIFT':'OUTSIDE'
}
export function affiliateCopyContext(segment:AffiliateSegmentTheme,title:string){
  const gift=segment.planContext?segment.planContext.framing==='GIFT':isChristmasSegment(segment)&&christmasProductKind(title)==='GIFT'
  return {segment:segment.name,terms:segment.discovery?.terms??[],purpose:gift?'GIFT_IDEA':segment.planContext?.role==='RELATED'?'COMPANION':'THEME',relationship:segment.planContext?.reason,instruction:gift?`Apresente como opção de presente no contexto do grupo ${segment.name}. Não apresente um presente como produto temático ou decoração.`:`A chamada deve fazer sentido para o grupo ${segment.name}, sem inventar características. Explique uma relação complementar quando houver, sem chamar o produto de temático.`}
}
