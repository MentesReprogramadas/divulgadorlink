import {RedirectAgeGate} from '@/features/redirects/redirect-age-gate'
import {PersonalPageBrand} from '@/features/profiles/components/personal-page-brand'
import {EmptyState} from '@/components/feedback/empty-state'
import {ButtonLink} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import styles from './channel-access-state.module.css'
export function ChannelAccessState({slug,ageRequired}:{slug:string;ageRequired:boolean}){
 const path='/p/'+slug
 return <main className={styles.page}><section className={styles.content}><h1>{ageRequired?'Confirme sua idade':'Canal indisponível'}</h1>{ageRequired?<RedirectAgeGate path={path}/>:<EmptyState action={<ButtonLink href={path}><ActionIcon name="back"/>Voltar à página</ButtonLink>}>Atualize a página para conferir as alternativas disponíveis.</EmptyState>}</section><PersonalPageBrand variant="platform"/></main>
}
