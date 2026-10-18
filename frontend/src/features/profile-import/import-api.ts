import {profileRequest} from '@/features/profiles/profile-api'
import type {ImportPreview,ImportChoice,ImportResult} from './import-contract'
export function previewImport(lines:string[],expectedVersion:number){return profileRequest<ImportPreview>('/import/preview',{method:'POST',body:JSON.stringify({lines,expectedVersion})})}
export function confirmImport(preview:ImportPreview,selectedItems:ImportChoice[]){return profileRequest<ImportResult>('/import/confirm',{method:'POST',body:JSON.stringify({previewId:preview.previewId,expectedVersion:preview.expectedVersion,idempotencyKey:preview.idempotencyKey,selectedItems})})}
