import type {ContactSubmission} from './contact-contract'
export const contactStatuses={NEW:'Novo',IN_PROGRESS:'Em atendimento',DONE:'Concluído'} as const
export type ContactStatus=keyof typeof contactStatuses
export type ContactNote={id:string;text:string;actorId:string;createdAt:string;updatedAt:string}
export type ContactHistory={version:number;kind:string;actorId:string;fromStatus:ContactStatus|null;toStatus:ContactStatus|null;noteId:string|null;createdAt:string}
export type ContactDetail=ContactSubmission&{notes:ContactNote[];history:ContactHistory[];nextHistoryCursor:number|null}
export const historyLabels:Record<string,string>={'status.changed':'Situação alterada','note.created':'Nota adicionada','note.updated':'Nota editada','note.deleted':'Nota removida'}
