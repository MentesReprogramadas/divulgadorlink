import {Field,Input} from '@/components/ui/input'
import {ActionIcon} from '@/components/ui/action-icon'
import {SkeletonRegion,SkeletonButton} from '@/components/feedback/skeleton'
import {WorkspaceActions,WorkspaceFilters} from '@/components/layout/workspace-controls'
import styles from './discovery.module.css'
import skeleton from '@/components/feedback/skeleton.module.css'
export function DiscoveryFieldsSkeleton({mode='editor'}:{mode?:'editor'|'filters'}){
 const fields=[
  <Field key="city" label="Cidade no Brasil" icon={<ActionIcon name="city"/>} hint={mode==='editor'?'Opcional. Local da comunidade ou atividade, sem endereço pessoal.':undefined}><Input disabled className={skeleton.control}/></Field>,
  <Field key="language" label="Idioma principal" icon={<ActionIcon name="language"/>}><Input disabled className={skeleton.control}/></Field>,
  <Field key="modality" label="Forma de participação" icon={<ActionIcon name="modality"/>}><Input disabled className={skeleton.control}/></Field>,
 ]
 return <SkeletonRegion label="Carregando dados do link">{mode==='filters'?<div className={`${styles.form} ${styles.filtersForm}`}><WorkspaceActions><SkeletonButton/></WorkspaceActions><WorkspaceFilters label="Filtros de local e idioma">{fields}</WorkspaceFilters></div>:<div className={styles.fields}>{fields}</div>}</SkeletonRegion>
}
