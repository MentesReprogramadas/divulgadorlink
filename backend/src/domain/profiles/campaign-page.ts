import {z} from 'zod'
import {ProfileError,type ProfileContent} from './profile'
import {profileInput,profileVersion} from './profile-input'
const selection=z.array(z.string().uuid()).min(1).max(500).refine(ids=>new Set(ids).size===ids.length,'Escolha cada link uma vez.')
export const campaignCreateInput=z.object({name:z.string().trim().min(1).max(80),slug:z.string().regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/),sourceRevisionId:z.string().uuid(),itemSelection:selection}).strict()
export const campaignUpdateInput=campaignCreateInput.omit({sourceRevisionId:true}).extend({expectedVersion:profileVersion}).strict()
/** Only remove approved content. Never accept new public text or destinations from a selection payload. */
export function campaignContent(source:ProfileContent,ids:string[]):ProfileContent{
 const selected=new Set(ids),groups=new Set(source.categories.filter(row=>row.visible).map(row=>row.id))
 const items=source.items.filter(row=>selected.has(row.id)&&row.visible&&!row.templateExample&&groups.has(row.categoryId))
 if(!ids.length||ids.length!==selected.size||items.length!==ids.length)throw new ProfileError(422,'Escolha links visíveis da publicação de origem.')
 return profileInput.parse({...source,...(source.appearance?{appearance:{...source.appearance,searchEnabled:false}}:{}),categories:source.categories.filter(row=>groups.has(row.id)&&items.some(item=>item.categoryId===row.id)),items,primaryItemId:items.some(row=>row.id===source.primaryItemId)?source.primaryItemId:null})
}

export function campaignIsPublished(row:{state:string;publication:unknown;publishedVersion:number|null}){return row.state==='PUBLISHED'&&row.publication!==null&&typeof row.publication==='object'&&!Array.isArray(row.publication)&&row.publishedVersion!==null&&row.publishedVersion>0}
