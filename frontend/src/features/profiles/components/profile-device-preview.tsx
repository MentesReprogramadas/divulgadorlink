import type { ProfileContent } from '../profile-contract'
import {ProfileSearchControls} from './profile-search-controls'
import {emptyProfileQuery} from '../profile-search-contract'
import { ProfileView } from './profile-view'
import styles from './profile-device-preview.module.css'

type ProfileDevicePreviewProps = { content: ProfileContent; photoAvailable?: boolean }

export function ProfileDevicePreview({ content, photoAvailable = true }: ProfileDevicePreviewProps) {
  return <div className={styles.device} inert><ProfileView content={content} avatarUrl={photoAvailable && content.avatarAssetId ? '/bff/v1/me/profile/avatar/' + content.avatarAssetId : undefined} heading="h3" embedded controls={content.appearance?.searchEnabled===true?<ProfileSearchControls embedded query={emptyProfileQuery()} groups={content.categories} pending={false}/>:undefined} /></div>
}
