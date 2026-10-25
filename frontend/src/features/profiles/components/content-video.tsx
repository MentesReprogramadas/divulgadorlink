'use client'
import {useState} from 'react'
import {pageText} from '@/domain/public-page-locale'
import type {ProfileLocale} from '../profile-contract'
import {videoEmbedUrl} from '../content-block'
import styles from './content-blocks.module.css'

export function ContentVideo({url,title,locale,preview=false}:{url:string;title:string;locale?:ProfileLocale;preview?:boolean}){
 const [loaded,setLoaded]=useState(false),src=videoEmbedUrl(url),t=(text:string)=>pageText(locale,text)
 if(!src)return null
 return <div className={styles.video}>{loaded&&!preview?<iframe src={src} title={title} allow="fullscreen; picture-in-picture" allowFullScreen referrerPolicy="no-referrer"/>:<div className={styles.videoConsent}><strong>{title}</strong><p>{t('Ao carregar, você se conecta ao provedor do vídeo.')}</p><button type="button" disabled={preview} onClick={()=>setLoaded(true)}>{t('Carregar vídeo')}</button></div>}</div>
}
