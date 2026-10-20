import type {PublicProfile,ProfileContent} from './profile-contract'
export type ProfileSearchQuery={q:string;categoryId:string|null;cursor:string|null}
export type ProfileSearchPage={restricted:true}|(Extract<PublicProfile,{restricted:false}>&{search:{filters:ProfileSearchQuery;groups:ProfileContent['categories'];total:number;nextCursor:string|null}})
export type ProfileSearchSource={kind:'public';slug:string}|{kind:'preview';at?:string;profileId?:string}
export const emptyProfileQuery=():ProfileSearchQuery=>({q:'',categoryId:null,cursor:null})
export function readProfileSearch(params:URLSearchParams):ProfileSearchQuery{
 for(const key of ['q','categoryId','cursor'])if(params.getAll(key).length>1)throw new Error('Use apenas um valor por filtro.')
 const q=(params.get('q')??'').trim(),categoryId=params.get('categoryId')||null,cursor=params.get('cursor')||null
 if(q.length>100||categoryId&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(categoryId)||cursor&&(cursor.length>2048||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(cursor)))throw new Error('Confira o texto e o grupo da busca. Você pode limpar os filtros e tentar novamente.')
 return {q,categoryId,cursor}
}
export function profileSearchParams(query:ProfileSearchQuery){const params=new URLSearchParams();if(query.q)params.set('q',query.q);if(query.categoryId)params.set('categoryId',query.categoryId);if(query.cursor)params.set('cursor',query.cursor);return params}
