const normalize=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()
export type PetProductCategory='FOOD'|'LITTER'|'FEEDING'|'HYGIENE'|'SCRATCHING'|'TOYS'|'REST'|'WALKING'|'HEALTH'|'OTHER'
export function petProductCategory(title:string):PetProductCategory {
  const text=normalize(title)
  if(/\barranhador(?:es)?\b/.test(text))return 'SCRATCHING'
  if(/\bareia\b|\bgranulado\b.*\bhigienic|\bpipicat\b/.test(text))return 'LITTER'
  if(/\bcomedouro|\bbebedouro|\balimentador|\bfonte\b.*\bagua\b|\bpote\b.*\bracao\b/.test(text))return 'FEEDING'
  if(/\bshampoo|\bxampu|\bbanho\b|\bhigiene\b|\bescova|\bluva\b|\btapete\b.*\bhigienic|\bfralda|\bsaco\b.*\bcata\b/.test(text))return 'HYGIENE'
  if(/\bbrinquedo|\bbolinha|\bmordedor|\bvarinha|\bratinho|\btunel\b/.test(text))return 'TOYS'
  if(/\bcaminha|\bcamas?\b|\bcolchonete|\btocas?\b|\bcasinha/.test(text))return 'REST'
  if(/\bcoleira|\bpeitoral|\bguia\b|\bpasseio\b|\btransporte\b/.test(text))return 'WALKING'
  if(/\bantipulga|\bvermifugo|\bmedicamento|\bsuplemento|\bveterinari/.test(text))return 'HEALTH'
  if(/\bracao\b|\bpetisco|\bsache\b|\balimento|\bbifinho/.test(text))return 'FOOD'
  return 'OTHER'
}

export function interleavePetCategories<T extends {title:string}>(products:T[]):T[] {
  const buckets=new Map<PetProductCategory,T[]>()
  for(const product of products){const key=petProductCategory(product.title),bucket=buckets.get(key)??[];bucket.push(product);buckets.set(key,bucket)}
  const result:T[]=[]
  for(let i=0;result.length<products.length;i++)for(const bucket of buckets.values())if(bucket[i])result.push(bucket[i])
  return result
}

export function petDiscoveryTerms(segmentName:string,seeds:string[]):string[] {
  const name=normalize(segmentName||seeds.join(' '))
  if(/hamster|roedor|passaro|coelho|aquario|peixe|\balimentacao\b|\bsaude\b|\bacessorios\b/.test(name)||petProductCategory(name)!=='OTHER')return []
  const cats=/gato|felino/.test(name),dogs=/cachorro|\bcaes\b|\bcao\b|canino/.test(name)
  if(cats&&!dogs)return ['Areia higiênica para gatos','Comedouro para gatos','Arranhador para gatos','Brinquedos para gatos','Shampoo para gatos','Cama para gatos','Fonte de água para gatos','Ração para gatos','Petiscos para gatos','Caixa de transporte para gatos']
  if(dogs&&!cats)return ['Comedouro para cachorros','Brinquedos para cachorros','Tapete higiênico para cachorros','Shampoo para cachorros','Cama para cachorros','Peitoral para cachorros','Bebedouro para cachorros','Ração para cachorros','Petiscos para cachorros','Caixa de transporte para cachorros']
  return ['Areia higiênica para gatos','Comedouro para pets','Arranhador para gatos','Brinquedos para cachorros','Luva escova para pets','Brinquedos para gatos','Tapete higiênico para cachorros','Cama para pets','Bebedouro para pets','Peitoral para cachorros','Ração para gatos','Ração para cachorros','Petiscos para pets','Shampoo para pets','Caixa de transporte para pets']
}
