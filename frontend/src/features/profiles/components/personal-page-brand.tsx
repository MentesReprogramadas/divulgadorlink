import Image from 'next/image'
import {CookieSettings} from '@/components/domain/consent'
import styles from './personal-page.module.css'
/** Shared small footer for the personal page and its access states. */
export function PersonalPageBrand(){return <footer className={styles.brand}><CookieSettings/><a href="/divulgar" aria-label="Criado por Tem Link Aqui"><span>Criado por</span><Image src="/logo.svg" alt="Tem Link Aqui" width={66} height={12} unoptimized/></a></footer>}
