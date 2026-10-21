import { DiscoverySkeleton } from '@/features/profile-discovery/discovery-skeleton'
import styles from '@/features/profile-discovery/discovery.module.css'
export default function Loading(){return <main className={styles.shell}><h1>Descobrir páginas</h1><DiscoverySkeleton/></main>}
