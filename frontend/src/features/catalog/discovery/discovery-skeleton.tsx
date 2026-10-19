import {Field,Input} from '@/components/ui/input'
import {ActionIcon} from '@/components/ui/action-icon'
import {SkeletonRegion} from '@/components/feedback/skeleton'
import styles from './discovery.module.css'
import skeleton from '@/components/feedback/skeleton.module.css'
export function DiscoveryFieldsSkeleton({mode='editor'}:{mode?:'editor'|'filters'}){
 const fields=[
  <Field key="city" label={mode==='editor'?'Cidade no Brasil (Opcional)':'Cidade'} icon={<ActionIcon name="city"/>}><Input disabled className={skeleton.control}/></Field>,
  <Field key="language" label={mode==='editor'?'Idioma principal (Opcional)':'Idioma'} icon={<ActionIcon name="language"/>}><Input disabled className={skeleton.control}/></Field>,
  <Field key="modality" label={mode==='editor'?'Forma de participação (Opcional)':'Participação'} icon={<ActionIcon name="modality"/>}><Input disabled className={skeleton.control}/></Field>,
 ]
 return <SkeletonRegion label="Carregando dados do link">{mode==='filters'?<div className={`${styles.form} ${styles.filtersForm}`}><div className={styles.filterFields}>{fields}</div></div>:<div className={styles.fields}>{fields}</div>}</SkeletonRegion>
}
