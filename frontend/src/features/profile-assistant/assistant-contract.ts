import type {ProfileContent,ProfileState} from '@/features/profiles/profile-contract'
export type AssistantInput={name:string;slug:string;activity:string;providedFactsText:string;linksText:string;linkIds:string[];expectedVersion:number}
export type AssistantField='bio'|'groups'|'order'|'appearance'
export type AssistantChoice={selectedFields:AssistantField[];bio:string;templateVersionId:string}
export type AssistantQuota={used:number;remaining:number;limit:number;resetAt:string;inputTokens?:number;outputTokens?:number}
export type AssistantSuggestion={schemaVersion:1;id:string;status:'READY';baseVersion:number;expiresAt:string;bio:string;templateVersionId:string;content:ProfileContent;provenance:{facts:string[];links:Array<{label:string;url:string}>};quota:AssistantQuota}
export type AssistantList={available:boolean;profile:ProfileState;quota:AssistantQuota;items:Array<{id:string;createdAt:string;expiresAt:string;baseVersion:number}>}
export const emptyAssistant=():AssistantInput=>({name:'',slug:'',activity:'',providedFactsText:'',linksText:'',linkIds:[],expectedVersion:0})
export function assistantApplyBody(suggestion:AssistantSuggestion,choice:AssistantChoice){return{expectedVersion:suggestion.baseVersion,selectedFields:choice.selectedFields,...(choice.bio!==suggestion.bio?{bioOverride:choice.bio}:{}),...(choice.templateVersionId!==suggestion.templateVersionId?{templateVersionId:choice.templateVersionId}:{})}}
