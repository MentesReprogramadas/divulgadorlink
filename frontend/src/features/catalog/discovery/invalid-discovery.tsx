import { ButtonLink } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
export function InvalidDiscovery({href}:{href:string}){
 return <div role="alert"><p>Não foi possível usar estes filtros. Escolha novamente.</p><ButtonLink href={href}><ActionIcon name="resetFilters"/>Limpar filtros</ButtonLink></div>
}
