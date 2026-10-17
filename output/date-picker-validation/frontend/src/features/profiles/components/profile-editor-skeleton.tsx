import { Skeleton, SkeletonButton, SkeletonField, SkeletonRegion } from '@/components/feedback/skeleton'
import { TabNavigation } from '@/components/ui/tabs'
import styles from './profiles.module.css'

export function ProfilePageSkeleton() {
  return <div className={styles.editor}><div className={styles.toolbar}><Skeleton width={88} height={24} /><div className={styles.toolbarActions}><div className={styles.actions}><Skeleton width={44} height={44} /></div></div></div><ProfileEditorSkeleton /></div>
}

export function ProfileEditorSkeleton() {
  return <SkeletonRegion><TabNavigation value="groups" label="Editar minha página" idPrefix="page-editor-pending" items={[{ id: 'groups', label: 'Grupos e links' }, { id: 'identity', label: 'Sua página' }, { id: 'photo', label: 'Foto e acesso' }, { id: 'appearance', label: 'Aparência' }, { id: 'publish', label: 'Publicação' }]} /><div className={styles.formFrame} data-layout="profile-form"><div className={styles.form}>
    <Skeleton width="45%" height={28} />
    <fieldset className={styles.controls}><legend className={styles.visuallyHidden}>Dados do perfil</legend><fieldset className={styles.identityFields}><legend>Sua página</legend><SkeletonField required label="Personalize o link da sua página" hint="Você vai compartilhar /p/seu-nome. Use 3 a 40 letras, números e hífens." /><SkeletonField required label="Título da sua página" hint="Ex.: Receitas da Ana. Este nome aparece no topo da página." /><SkeletonField label="Descrição" multiline /></fieldset><div className={styles.actions}><SkeletonButton /></div></fieldset>
  </div></div></SkeletonRegion>
}
