import {pageText} from '@/domain/public-page-locale'
import type {ProfileLocale} from '../profile-contract'
import Image from 'next/image'
import {CookieSettings} from '@/components/domain/consent'
import styles from './personal-page.module.css'
/** Shared small footer for the personal page and its access states. */
export function PersonalPageBrand({locale,variant='personal'}:{locale?:ProfileLocale;variant?:'personal'|'platform'}){const t=(text:string)=>pageText(locale,text);return <footer className={styles.brand}><CookieSettings label={t('Gerenciar cookies')}/><a href="/divulgar" aria-label={t('Criado por')+' Tem Link Aqui'}><span>{t('Criado por')}</span><Image src={variant==='platform'?'/brand/ondas-logo.svg':'/brand/confluencia/assinatura-claro.svg'} alt="Tem Link Aqui" width={90} height={19} unoptimized/></a></footer>}
