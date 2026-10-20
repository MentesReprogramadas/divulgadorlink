export type DigestLink={id:string;tenantId:string;nicheId:string;status:string;requiresAge:boolean;ownerActive:boolean}
export function selectDigestLinks<T extends DigestLink>(rows:T[],input:{enabled:boolean;active:boolean;tenantId:string;followed:Set<string>;seen:Set<string>}):T[]{
 if(!input.enabled||!input.active)return[]
 const unique=new Set<string>()
 return rows.filter(row=>{if(row.tenantId!==input.tenantId||row.status!=='PUBLISHED'||row.requiresAge||!row.ownerActive||!input.followed.has(row.nicheId)||input.seen.has(row.id)||unique.has(row.id))return false;unique.add(row.id);return true})
}
export const DIGEST_INTERVAL_MS={WEEKLY:7*86400000,MONTHLY:30*86400000} as const
