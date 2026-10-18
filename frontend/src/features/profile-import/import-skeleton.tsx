import {SkeletonRegion} from '@/components/feedback/skeleton'
import {ButtonLink} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {FormSteps} from '@/components/ui/form-steps'
import {WorkspaceActions} from '@/components/layout/workspace-controls'
import {ImportPaste} from './import-paste'
import styles from './import.module.css'
export const importSteps=['Colar','Revisar','Confirmar']
export function ImportSkeleton(){return <SkeletonRegion label="Carregando importação"><div className={styles.page}><WorkspaceActions><ButtonLink variant="secondary" href="/painel/perfil"><ActionIcon name="back"/>Voltar à edição</ButtonLink></WorkspaceActions><FormSteps labels={importSteps} current={0}/><ImportPaste loading/></div></SkeletonRegion>}
