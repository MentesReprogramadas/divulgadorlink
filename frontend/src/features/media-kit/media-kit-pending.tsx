import {SkeletonRegion} from '@/components/feedback/skeleton'
import {emptyProfile} from '@/features/profiles/profile-contract'
import {MediaKitView} from './media-kit-view'
import styles from './media-kit.module.css'
export function MediaKitPending(){return <SkeletonRegion label="Carregando apresentação para parceiros"><div className={styles.publicPending}><MediaKitView pending kit={{restricted:false,presentation:{...emptyProfile(),name:'Nome da sua página',bio:'Apresentação da sua página'},profilePath:'#',contacts:[],metrics:[{label:'Resultado da sua página',linkName:'Nome do link',metric:'CLICKS',source:'MEASURED',value:null,coverage:'UNAVAILABLE',period:{from:'2026-10-01',to:'2026-10-19'},updatedAt:'2026-10-19T12:00:00Z',currentDayPartial:false}],manualMetrics:[],updatedAt:'2026-10-19T12:00:00Z',publishedAt:null,sourceVersion:1}}/></div></SkeletonRegion>}
