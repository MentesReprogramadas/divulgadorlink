export type ProfileHostRow={hostname:string;status:'PENDING'|'ACTIVE'|'RETIRED'|'DISABLED';tlsVerifiedAt:string|null;version:number}
export type ProfileHostState={hosts:ProfileHostRow[];version:number;bases:string[];allowed:boolean;published:boolean;hasPage:boolean}
export const profileHostStatus={PENDING:'Aguardando HTTPS',ACTIVE:'Ativo',RETIRED:'Endereço anterior',DISABLED:'Desativado'} as const
