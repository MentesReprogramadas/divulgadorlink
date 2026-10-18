import { privateMetadata } from '@/domain/crawler-policy'
import { BillingScreen } from '@/features/profile-billing/billing-screen'
export const metadata = {...privateMetadata,title:'Assinatura da minha página | Tem Link Aqui'}
export default function Page(){return <BillingScreen/>}
