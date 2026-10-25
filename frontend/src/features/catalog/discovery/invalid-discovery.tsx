import { ButtonLink } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { LiquidLens } from '@/components/ui/liquid-lens'
import styles from './invalid-discovery.module.css'

export function InvalidDiscovery({href,headingLevel=1}:{href:string;headingLevel?:1|2}){
 const Heading=headingLevel===1?'h1':'h2'
 return <section className={styles.root} role="alert"><LiquidLens radius={16}/><Heading>Revise os filtros</Heading><p>Não foi possível usar estes filtros. Escolha novamente.</p><ButtonLink href={href}><ActionIcon name="resetFilters"/>Limpar filtros</ButtonLink></section>
}
