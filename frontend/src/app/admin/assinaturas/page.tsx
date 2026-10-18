import { privateMetadata } from '@/domain/crawler-policy'
import { BillingAdmin } from '@/features/profile-billing/billing-admin'
export const metadata={...privateMetadata,title:'Assinaturas de páginas | Tem Link Aqui'}
export default function Page(){return <BillingAdmin/>}
