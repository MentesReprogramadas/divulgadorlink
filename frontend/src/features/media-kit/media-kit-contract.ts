import type {ProfileContent} from '@/features/profiles/profile-contract'
export const platforms={INSTAGRAM:'Instagram',YOUTUBE:'YouTube',TIKTOK:'TikTok',FACEBOOK:'Facebook',LINKEDIN:'LinkedIn',TELEGRAM:'Telegram',WHATSAPP:'WhatsApp',OTHER:'Outra plataforma'} as const
export const metricLabels={IMPRESSIONS:'Impressões',CLICKS:'Cliques',CTR:'Taxa de cliques'} as const
export type MediaSelection={linkId:string;metric:keyof typeof metricLabels;from:string;to:string}
export type ManualMetric={platform:keyof typeof platforms;value:number;asOf:string}
export type MediaContent={publicFields:{showBio:boolean;showPhoto:boolean;contactIds:string[]};metricSelections:MediaSelection[];manualMetrics:ManualMetric[]}
export type MediaState={draft:MediaContent;version:number;publishedVersion:number|null;publishedAt?:string|null;hasPublishedProfile:boolean;publicPath:string;changed:boolean;contacts:Array<{id:string;kind:'EMAIL'|'PHONE';value:string}>;links:Array<{id:string;name:string}>}
export type PublicMediaKit={restricted:true}|{restricted:false;presentation:ProfileContent;profilePath:string;contacts:Array<{kind:'EMAIL'|'PHONE';value:string}>;metrics:Array<{label:string;linkName:string;metric:keyof typeof metricLabels;source:'MEASURED';value:number|null;coverage:string;period:{from:string;to:string};updatedAt:string;currentDayPartial:boolean}>;manualMetrics:Array<ManualMetric&{source:'INFORMED';coverage:'OWNER_REPORTED';period:{from:string;to:string};updatedAt:string}>;updatedAt:string;publishedAt:string|null;sourceVersion:number}
export const emptyMediaContent=():MediaContent=>({publicFields:{showBio:true,showPhoto:true,contactIds:[]},metricSelections:[],manualMetrics:[]})
