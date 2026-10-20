import {z} from 'zod'
import {performanceRange} from '@/domain/analytics/performance'
export const mediaPublicFields=z.object({showBio:z.boolean().default(true),showPhoto:z.boolean().default(true),contactIds:z.array(z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/)).max(2).refine(ids=>new Set(ids).size===ids.length)}).strict()
export const mediaSelection=z.object({linkId:z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/),metric:z.enum(['IMPRESSIONS','CLICKS','CTR']),from:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),to:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).strict()
export const manualMetric=z.object({platform:z.enum(['INSTAGRAM','YOUTUBE','TIKTOK','FACEBOOK','LINKEDIN','TELEGRAM','WHATSAPP','OTHER']),value:z.number().int().min(0).max(1_000_000_000),asOf:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).strict()
export const mediaKitContent=z.object({publicFields:mediaPublicFields,metricSelections:z.array(mediaSelection).max(6).refine(rows=>new Set(rows.map(row=>JSON.stringify(row))).size===rows.length),manualMetrics:z.array(manualMetric).max(4).refine(rows=>new Set(rows.map(row=>row.platform)).size===rows.length)}).strict()
export type MediaKitContent=z.infer<typeof mediaKitContent>
export function validateMediaDates(content:MediaKitContent,now:Date){for(const metric of content.metricSelections)performanceRange(metric,now);for(const metric of content.manualMetrics)performanceRange({from:metric.asOf,to:metric.asOf},now)}
export function manualMediaMetric(input:z.infer<typeof manualMetric>){return {...input,source:'INFORMED' as const,period:{from:input.asOf,to:input.asOf},coverage:'OWNER_REPORTED' as const}}
export function measuredMediaMetric(value:number|null,coverage:string){return {value:coverage==='COMPLETE'?value:null,source:'MEASURED' as const,coverage}}
export function visibleMediaFields(published:z.infer<typeof mediaPublicFields>,draft:z.infer<typeof mediaPublicFields>){return {showBio:published.showBio&&draft.showBio,showPhoto:published.showPhoto&&draft.showPhoto,contactIds:published.contactIds.filter(id=>draft.contactIds.includes(id))}}
export const emptyMediaKit=():MediaKitContent=>({publicFields:{showBio:true,showPhoto:true,contactIds:[]},metricSelections:[],manualMetrics:[]})
