import { Skeleton, SkeletonButton, SkeletonField, SkeletonRegion } from '@/components/feedback/skeleton'
import { FormSteps } from '@/components/ui/form-steps'
import { ActionIcon } from '@/components/ui/action-icon'
import styles from './submission-form.module.css'
import skeleton from '@/components/layout/workspace-skeleton.module.css'

export function SubmissionSkeleton() {
  return <SkeletonRegion><form className={`form-grid ${styles.form} ${skeleton.form}`} data-layout="submission-form">
    <FormSteps labels={['Título e acesso', 'Assunto e descrição', 'Conferir e enviar']} current={0} />
    <fieldset className={styles.stepFields}><legend className={styles.srOnly}>Título e acesso</legend>
      <div className={styles.context}><span>Publicação grátis</span><Skeleton width={130} height={21} /></div>
      <SkeletonField required label="Título do link" hint="Nome do grupo, canal ou página. Ex.: Receitas da Ana. Não coloque seu nome pessoal." /><div><SkeletonField required icon={<ActionIcon name="link" />} label="Link de acesso" hint="Cole o endereço completo, começando com https://." /></div>
    </fieldset><div className={styles.stepActions}><SkeletonButton /></div>
  </form></SkeletonRegion>
}
