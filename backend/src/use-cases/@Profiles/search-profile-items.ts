import {publicContactForm,previewContactForm} from '@/repositories/contact-forms'
import type {PrismaClient} from '@prisma/client'
import {env} from '@/env'
import {publicProfile,previewProfile} from '@/repositories/profiles-repository'
import {profileItemSearchPage} from '@/lib/profile-item-search-page'
import {localizeProfile,type ProfileLocale} from '@/domain/profiles/profile-translations'
type Query={q:string;categoryId?:string;cursor?:string;locale?:ProfileLocale}
export async function searchPublicProfileItems(db:PrismaClient,tenantId:string,slug:string,age:boolean,query:Query){
 const original=await publicProfile(db,tenantId,slug,age),projected=original.restricted?original:localizeProfile(original,query.locale)
 const result=profileItemSearchPage(projected,JSON.stringify(['public',tenantId,slug,query.locale??'primary']),{q:query.q,categoryId:query.categoryId??null},query.cursor??null,env.JWT_SECRET);return result.restricted?result:{...result,search:{...result.search,filters:{...result.search.filters,...(query.locale?{locale:query.locale}:{})}},contactForm:(await publicContactForm(db,tenantId,slug,age)).form}
}
export async function searchPreviewProfileItems(db:PrismaClient,actor:{tenantId:string;ownerId:string;age:boolean},query:Query&{at?:string}){
 const original=await previewProfile(db,actor,query.at?new Date(query.at):undefined),projected=original.restricted?original:localizeProfile(original,query.locale)
 const result=profileItemSearchPage(projected,JSON.stringify(['preview',actor.tenantId,actor.ownerId,query.at??'now',query.locale??'primary']),{q:query.q,categoryId:query.categoryId??null},query.cursor??null,env.JWT_SECRET);return result.restricted?result:{...result,search:{...result.search,filters:{...result.search.filters,...(query.locale?{locale:query.locale}:{})}},contactForm:await previewContactForm(db,actor)}
}
