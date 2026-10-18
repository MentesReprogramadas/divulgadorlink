import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import styles from './profile-groups.module.css'
/** Same controls and widths in the group manager and its loading composition. */
export function ProfileGroupActions({canChoosePrimary,pending=false,onPrimary,onNewGroup,onChannels}:{canChoosePrimary:boolean;pending?:boolean;onPrimary:()=>void;onNewGroup:()=>void;onChannels?:()=>void}){
 return <header className={styles.sectionHeading}><h2 className={styles.srOnly}>Grupos e links</h2><div className={styles.actions}>{onChannels?<Button type="button" variant="secondary" disabled={pending} onClick={onChannels}><ActionIcon name="channels"/>Canais de acesso</Button>:null}<Button type="button" variant="secondary" disabled={pending||!canChoosePrimary} onClick={onPrimary}><ActionIcon name="primaryLink"/>Botão principal</Button><Button type="button" data-new-group disabled={pending} onClick={onNewGroup}><ActionIcon name="plus"/>Adicionar grupo</Button></div></header>
}
