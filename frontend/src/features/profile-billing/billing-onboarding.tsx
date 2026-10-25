import {ButtonLink} from '@/components/ui/button'
import {LiquidLens} from '@/components/ui/liquid-lens'
import styles from './billing.module.css'

export function BillingOnboarding({requirement}:{requirement:'CREATE_PAGE'|'VERIFY'}){
 const needsPage=requirement==='CREATE_PAGE'
 return <section className={styles.onboarding} aria-label={needsPage?'Crie sua página':'Verifique sua conta'}><h2>{needsPage?'Primeiro, crie sua página':'Confirme seu e-mail para continuar'}</h2><p>{needsPage?'Sua página é gratuita. Depois de criá-la, você pode escolher um plano para adicionar mais recursos.':'Verifique sua conta antes de escolher uma assinatura.'}</p><ButtonLink href={needsPage?'/painel/perfil':'/painel/verificar'}>{needsPage?'Criar minha página':'Verificar conta'}</ButtonLink><LiquidLens radius={16}/></section>
}
