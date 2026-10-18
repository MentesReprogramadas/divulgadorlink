import type {ProfileState} from '@/features/profiles/profile-contract'
export type ImportLine={line:number;url:string|null;suggestedTitle:string;status:'READY'|'INVALID'|'DUPLICATE';message:string|null}
export type ImportChoice={line:number;label:string;categoryId:string|null;newCategoryName:string|null}
export type ImportPreview={previewId:string;expectedVersion:number;idempotencyKey:string;expiresAt:string;items:ImportLine[]}
export type ImportEntry=ImportLine&ImportChoice&{selected:boolean}
export type ImportResult={createdIds:string[];alreadyApplied:boolean;profile:ProfileState}
