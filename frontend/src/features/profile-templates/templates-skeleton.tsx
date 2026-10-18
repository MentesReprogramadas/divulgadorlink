import {SkeletonButton,SkeletonField,SkeletonRegion} from '@/components/feedback/skeleton'
import {WorkspaceActions,WorkspaceFilters} from '@/components/layout/workspace-controls'
import {defaultAppearance} from '@/features/profiles/profile-appearance'
import type {ProfileTemplate} from './template-contract'
import {TemplateGrid} from './template-grid'
import styles from './templates.module.css'
const placeholders:ProfileTemplate[]=['Comunidades e grupos','Criadores','Lojas','Profissionais','Eventos'].map<ProfileTemplate>((title,index)=>({versionId:'loading-'+index,activity:'CREATOR',title,description:'Organize seus links em uma página feita para compartilhar.',appearance:defaultAppearance,demoName:'',demoBio:'',groups:[]}))
export function TemplatesSkeleton(){return <SkeletonRegion label="Carregando modelos"><div className={styles.page}><WorkspaceActions><SkeletonButton/></WorkspaceActions><WorkspaceFilters label="Filtros de modelos"><SkeletonField label="Tipo de página"/></WorkspaceFilters><TemplateGrid templates={placeholders} loading/></div></SkeletonRegion>}
