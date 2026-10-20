import {publicContactForm,previewContactForm} from '@/repositories/contact-forms'
import type {PrismaClient} from '@prisma/client'
import {env} from '@/env'
import {publicProfile,previewProfile} from '@/repositories/profiles-repository'
import {profileItemSearchPage} from '@/lib/profile-item-search-page'
type Query={q:string;categoryId?:string;cursor?:string}
export async function searchPublicProfileItems(db:PrismaClient,tenantId:string,slug:string,age:boolean,query:Query){
 const projected=await publicProfile(db,tenantId,slug,age)
 const result=profileItemSearchPage(projected,JSON.stringify(['public',tenantId,slug]),{q:query.q,categoryId:query.categoryId??null},query.cursor??null,env.JWT_SECRET);return result.restricted?result:{...result,contactForm:(await publicContactForm(db,tenantId,slug,age)).form}
}
export async function searchPreviewProfileItems(db:PrismaClient,actor:{tenantId:string;ownerId:string;age:boolean},query:Query&{at?:string}){
 const projected=await previewProfile(db,actor,query.at?new Date(query.at):undefined)
 const result=profileItemSearchPage(projected,JSON.stringify(['preview',actor.tenantId,actor.ownerId,query.at??'now']),{q:query.q,categoryId:query.categoryId??null},query.cursor??null,env.JWT_SECRET);return result.restricted?result:{...result,contactForm:await previewContactForm(db,actor)}
}
