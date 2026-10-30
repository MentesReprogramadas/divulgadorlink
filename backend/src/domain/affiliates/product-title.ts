export const affiliateTitleLimit=60
const normalize=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('pt-BR')
const qualifiers=new Set('sem nao nem exceto except without not menos exclui excluido excluida excluindo excluding somente apenas'.split(' '))
const connectives=new Set('de do da dos das com para e ou em o a os as no na nos nas'.split(' '))
const units=new Set('cm mm m kg g ml l w v gb tb mah hz mhz ghz un'.split(' '))
const quantities=new Set('unidade unidades peca pecas galho galhos'.split(' '))
export const affiliateTitleHasQualifier=(title:string)=>(normalize(title).match(/[\p{L}\p{N}]+/gu)??[]).some(word=>qualifiers.has(word))

export function compactAffiliateTitle(title:string):string {
  const clean=title.replace(/[\r\n*_~`]/g,' ').replace(/\s+/g,' ').trim()
  const allWords=clean.split(' '),qualifierIndex=allWords.findIndex(affiliateTitleHasQualifier)
  if(qualifierIndex>=0&&clean.length<=affiliateTitleLimit)return clean
  // Keep the whole restriction together: shortening “sem cartão” can misrepresent the product.
  const restriction=qualifierIndex>=0?allWords.slice(qualifierIndex).join(' '):null
  const words=qualifierIndex>=0?allWords.slice(0,qualifierIndex):allWords,seen=new Set<string>(),atoms:{text:string;required:boolean}[]=[]
  let skipConnective=false
  for(let i=0;i<words.length;i++){
    let text=words[i].replace(/^[,;:|]+|[,;:|]+$/g,'')
    if(!text)continue
    let key=normalize(text)
    const next=normalize(words[i+1]??'')
    const quantity=/^\d+(?:[.,]\d+)?$/.test(key)&&(units.has(next)||quantities.has(next))
    if(quantity){text+=' '+words[++i];key=normalize(text).replace(/\s/g,'')}
    const connective=connectives.has(key)
    if(!connective&&!units.has(key)&&seen.has(key)){skipConnective=true;continue}
    if(connective&&skipConnective)continue
    if(!connective){skipConnective=false;seen.add(key)}
    if(quantity&&quantities.has(next))seen.add(next)
    atoms.push({text,required:atoms.length===0||/\d/.test(text)})
  }
  if(restriction)atoms.push({text:restriction,required:true})
  const required=atoms.filter(atom=>atom.required).map(atom=>atom.text).join(' ')
  // shortcut: exceptionally long model/specification lists remain intact rather than losing facts.
  if(required.length>affiliateTitleLimit)return clean
  const selected:string[]=[]
  for(let i=0;i<atoms.length;i++){
    const atom=atoms[i],remaining=atoms.slice(i+1).filter(part=>part.required).map(part=>part.text)
    if(atom.required||[...selected,atom.text,...remaining].join(' ').length<=affiliateTitleLimit)selected.push(atom.text)
    else while(selected.length>1&&connectives.has(normalize(selected[selected.length-1])))selected.pop()
  }
  while(selected.length>1&&connectives.has(normalize(selected[selected.length-1])))selected.pop()
  return selected.join(' ')
}
