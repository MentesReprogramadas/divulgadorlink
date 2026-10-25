import {pageText} from '@/domain/public-page-locale'
import type {ProfileLocale} from '@/features/profiles/profile-contract'
import type {ContactDefinition} from './contact-contract'
// Presentation validation mirrors the existing F22 contract; the API remains authoritative.
export const contactLimits={name:120,email:254,phone:30,company:160,message:2000} as const
export type ContactKey=keyof typeof contactLimits
export function contactFieldError(field:ContactDefinition['fields'][number],raw:string,locale?:ProfileLocale){
 const t=(text:string)=>pageText(locale,text)
 const value=raw.trim()
 if(field.required&&!value)return t('Preencha este campo.')
 if(value.length>contactLimits[field.key])return t(`Use até ${contactLimits[field.key]} caracteres.`)
 if(value&&field.key==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))return t('Digite um e-mail válido.')
 if(value&&field.key==='phone'&&(!/^\+?[\d ()-]{8,30}$/.test(value)||!/[0-9]/.test(value)))return t('Digite um telefone com DDD. Ex.: (16) 99999-9999.')
 return undefined
}
