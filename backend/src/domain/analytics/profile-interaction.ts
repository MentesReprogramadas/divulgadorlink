import {z} from 'zod'
import {createHash} from 'node:crypto'
import {measurementTrafficAllowed} from './measurement-policy'
import {ctr} from './rates'
export const PROFILE_INTERACTION_RETENTION_DAYS=180
export const PROFILE_INTERACTION_MIN_SAMPLE=10
export type ProfileViewport='MOBILE'|'TABLET'|'DESKTOP'
export type ProfileInteractionKind='PAGE'|'IMPRESSION'|'CLICK'|'SCROLL'
export type InteractionEvent={campaignId?:string|null;eventId:string;tenantId:string;profileId:string;revisionId:number;blockId:string|null;kind:ProfileInteractionKind;viewportBucket:ProfileViewport;scrollBucket:number|null;sessionKey:string;day:string}
export type InteractionBlock={id:string;label:string}
export type InteractionSummary={available:boolean;sessions:number;pageViews:number|null;blocks:Array<InteractionBlock&{impressions:number|null;clicks:number|null;ctr:number|null}>;scrollBuckets:Array<{threshold:number;label:string;reached:number|null}>}
export type InteractionFacts={sessions:number;pageViews:number;blocks:Array<{id:string;impressions:number;clicks:number}>;reach:ReadonlyMap<number,number>}
/** SQL and the raw-event oracle share the exact sample/null/rate policy. */
export function profileInteractionSummary(facts:InteractionFacts,blocks:readonly InteractionBlock[],minimumSample=PROFILE_INTERACTION_MIN_SAMPLE):InteractionSummary{
 const available=facts.sessions>0&&facts.sessions>=minimumSample
 return {available,sessions:facts.sessions,pageViews:available?facts.pageViews:null,blocks:blocks.map(block=>{
  const {impressions=0,clicks=0}=facts.blocks.find(row=>row.id===block.id)??{}
  return {...block,impressions:available?impressions:null,clicks:available?clicks:null,ctr:available&&impressions?Math.round(ctr(clicks,impressions)*10)/10:null}
 }),scrollBuckets:[25,50,75,100].map(threshold=>({threshold,label:threshold+'% da página alcançada',reached:available?facts.reach.get(threshold)??0:null}))}
}
export const profileInteractionInput=z.object({
 eventId:z.string().uuid(),profileId:z.string().uuid(),revisionId:z.number().int().positive(),blockId:z.string().uuid().nullable(),
 kind:z.enum(['PAGE','IMPRESSION','CLICK','SCROLL']),viewportBucket:z.enum(['MOBILE','TABLET','DESKTOP']),
 scrollBucket:z.union([z.literal(25),z.literal(50),z.literal(75),z.literal(100)]).nullable(),surfaceToken:z.string().min(1).max(2048),
}).strict().superRefine((event,ctx)=>{
 const button=event.kind==='IMPRESSION'||event.kind==='CLICK'
 if(button!==Boolean(event.blockId))ctx.addIssue({code:z.ZodIssueCode.custom,path:['blockId'],message:'Escolha um bloco válido para o tipo de evento.'})
 if((event.kind==='SCROLL')!==(event.scrollBucket!==null))ctx.addIssue({code:z.ZodIssueCode.custom,path:['scrollBucket'],message:'Marco de rolagem inválido.'})
})
export function interactionIdentity(event:InteractionEvent):string{
 return createHash('sha256').update(JSON.stringify([event.tenantId,event.profileId,event.revisionId,event.day,event.sessionKey,event.viewportBucket,event.kind,event.blockId,event.scrollBucket,...(event.campaignId?[event.campaignId]:[])])).digest('hex')
}
export function summarizeProfileInteraction(events:readonly InteractionEvent[],blocks:readonly InteractionBlock[],context:{revisionId:number;viewportBucket:ProfileViewport|'ALL';minimumSample?:number}):InteractionSummary{
 const seenIds=new Set<string>(),seenInteractions=new Set<string>()
 const rows=events.filter(event=>event.revisionId===context.revisionId&&(context.viewportBucket==='ALL'||event.viewportBucket===context.viewportBucket)).filter(event=>{
  const identity=interactionIdentity(event)
  if(seenIds.has(event.eventId)||seenInteractions.has(identity))return false
  seenIds.add(event.eventId);seenInteractions.add(identity);return true
 })
 const sessions=new Set(rows.filter(row=>row.kind==='PAGE').map(row=>row.day+':'+row.sessionKey)).size
 return profileInteractionSummary({sessions,pageViews:rows.filter(row=>row.kind==='PAGE').length,
  blocks:blocks.map(block=>({id:block.id,impressions:rows.filter(row=>row.blockId===block.id&&row.kind==='IMPRESSION').length,clicks:rows.filter(row=>row.blockId===block.id&&row.kind==='CLICK').length})),
  reach:new Map([25,50,75,100].map(threshold=>[threshold,new Set(rows.filter(row=>row.kind==='SCROLL'&&(row.scrollBucket??0)>=threshold).map(row=>row.day+':'+row.sessionKey)).size])),
 },blocks,context.minimumSample)
}
export function canMeasureProfile(input:{consent?:string;dnt?:string;gpc?:string;userAgent?:string;testTraffic?:string;owner?:boolean;admin?:boolean;support?:boolean}):boolean{
 return input.consent==='v1_yes'&&!input.owner&&!input.admin&&!input.support&&measurementTrafficAllowed(input)
}
