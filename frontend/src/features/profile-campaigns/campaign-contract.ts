import type {ProfileContent,PublicProfile} from '@/features/profiles/profile-contract'
export type CampaignRow={id:string;name:string;slug:string;state:'DRAFT'|'PUBLISHED'|'ARCHIVED';version:number;publishedVersion:number|null;sourceRevisionId:string;sourceVersion:number;changed:boolean;publicPath:string;createdAt:string}
export type CampaignDetail=CampaignRow&{content:ProfileContent;source:ProfileContent}
export type CampaignList={campaigns:CampaignRow[];page:number;pageSize:number;total:number;hasPublishedProfile:boolean}
export type CampaignEditorDraft={id:string|null;name:string;slug:string;sourceRevisionId:string;sourceVersion:number;source:ProfileContent;selected:string[];expectedVersion:number}
export type CampaignPublic=PublicProfile&{parentSlug?:string}
