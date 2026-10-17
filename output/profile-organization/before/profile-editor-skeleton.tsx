import { Skeleton, SkeletonButton, SkeletonField, SkeletonRegion } from '@/components/feedback/skeleton'
import { TabNavigation } from '@/components/ui/tabs'
import { FormSteps } from '@/components/ui/form-steps'
import styles from './profiles.module.css'

export function ProfilePageSkeleton() {
  return <div className={styles.editor}><div className={styles.toolbar}><Skeleton width={88} height={24} /><div className={styles.toolbarActions}><div className={styles.actions}><Skeleton width={44} height={44} /></div></div></div><ProfileEditorSkeleton /></div>
}

export function ProfileEditorSkeleton() {
  return <SkeletonRegion><TabNavigation value="content" label="Editar minha página" idPrefix="page-editor-pending" items={[{ id: 'content', label: 'Conteúdo' }, { id: 'appearance', label: 'Aparência' }]} /><div className={styles.formFrame} data-layout="profile-form"><div className={styles.form}>
    <p className={styles.note}>Crie uma página pública com seus links, foto e grupos.</p>
    <FormSteps labels={['Sua página', 'Foto e acesso', 'Grupos e links', 'Publicar']} current={0} />
    <fieldset className={styles.controls}><legend className={styles.visuallyHidden}>Dados do perfil</legend><fieldset className={styles.identityFields}><legend>Sua página</legend><SkeletonField required label="Personalize o link da sua página" hint="Você vai compartilhar /p/seu-nome. Use 3 a 40 letras, números e hífens." /><SkeletonField required label="Título da sua página" hint="Ex.: Receitas da Ana. Este nome aparece no topo da página." /><SkeletonField label="Descrição" multiline /></fieldset><div className={styles.actions}><SkeletonButton /></div></fieldset>
  </div></div></SkeletonRegion>
}
