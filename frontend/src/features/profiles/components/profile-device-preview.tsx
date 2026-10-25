import type { ProfilePresentation } from '../profile-contract'
import {ProfileSearchControls} from './profile-search-controls'
import {emptyProfileQuery} from '../profile-search-contract'
import { ProfileView } from './profile-view'
import styles from './profile-device-preview.module.css'

type ProfileDevicePreviewProps = { content: ProfilePresentation; photoAvailable?: boolean; frame?:'fluid'|'iphone' }

export function ProfileDevicePreview({ content, photoAvailable = true,frame='fluid' }: ProfileDevicePreviewProps) {
  const view=<ProfileView content={content} mediaBaseUrl="/bff/v1/me/profile/avatar/" avatarUrl={photoAvailable && content.avatarAssetId ? '/bff/v1/me/profile/avatar/' + content.avatarAssetId : undefined} heading="h3" embedded controls={content.appearance?.searchEnabled===true?<ProfileSearchControls locale={content.uiLocale??content.locale} embedded query={emptyProfileQuery()} groups={content.categories} pending={false}/>:undefined} />
  if(frame==='iphone')return <div className={styles.iphone} data-preview-device="iphone"><span className={styles.camera} aria-hidden="true"/><div className={styles.screen} role="region" aria-label="Tela da prévia em formato iPhone" tabIndex={0}><div className={styles.screenContent} inert>{view}</div></div><span className={styles.home} aria-hidden="true"/></div>
  return <div className={styles.device} inert>{view}</div>
}
