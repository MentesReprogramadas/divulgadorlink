const normalize=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('pt-BR')
const pets=/\b(?:pets?|cachorros?|caes|cao|gatos?|felinos?|caninos?|dogs?|cats?|hamsters?|roedores?|passaros?|coelhos?|aquarios?|antipulgas?|veterinari[oa]s?|petiscos?|arranhadores?)\b/
const petCategory=/\bracao\b|\bareia\b.*\b(?:higienica|aglomerante|silica|biodegradavel)\b/
const children=/\b(?:bebes?|baby|babies|infantis|infantil|criancas?|chocalhos?|manhattan|pediatrico|recem nascid[oa])\b/
export type AffiliateSegmentTheme={name:string;discovery?:{terms:string[]}|null}
export function isPetSegment(segment:AffiliateSegmentTheme){
  const name=normalize(segment.name),terms=segment.discovery?.terms??[]
  return pets.test(name)||/animais(?: de estimacao)?/.test(name)||terms.length>0&&terms.every(term=>pets.test(normalize(term))||petCategory.test(normalize(term)))
}
export function affiliateProductFitsSegment(segment:AffiliateSegmentTheme,title:string){
  if(!isPetSegment(segment))return true
  const text=normalize(title)
  return !children.test(text)&&!text.includes('racao humana')&&(pets.test(text)||petCategory.test(text))
}
export function petSearchTerm(term:string){
  if(pets.test(normalize(term)))return term
  return `${term.slice(0,100).trim()} para ${/areia/.test(normalize(term))?'gatos':'pets'}`
}
