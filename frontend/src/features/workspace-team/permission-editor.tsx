'use client'
import {useState} from 'react'
import {ActionIcon} from '@/components/ui/action-icon'
import type {Grants} from './workspace-access'
import styles from './workspace-team.module.css'
import {permissionProfiles,profileGrants,matchedPermissionProfile,permissionProfile,permissionGroupIcon,type PermissionSection} from './permission-profiles'
export {permissionProfile,type PermissionSection} from './permission-profiles'
type PermissionEditorProps={sections:PermissionSection[];grants:Grants;onChange:(grants:Grants)=>void;disabled?:boolean}
export function PermissionSummary({sections,grants}:{sections:PermissionSection[];grants:Grants}){
 const enabled=sections.filter(row=>grants[row.id]?.read)
 return <section className={styles.accessSummary} aria-label="Resumo das permissões"><div className={styles.summaryHeading}><strong>{permissionProfile(sections,grants)}</strong><span>{enabled.length} de {sections.length} seções com acesso</span></div>{enabled.length?<ul>{enabled.map(row=><li key={row.id}><span>{row.label}</span><strong>{grants[row.id]?.write?'Ver e editar':'Só visualizar'}</strong></li>)}</ul>:<p>Nenhuma seção liberada.</p>}<p className={styles.hint}>Seções que não aparecem nesta lista ficam sem acesso. Editar inclui visualizar e realizar as ações disponíveis na seção. Configurações da conta e gestão da equipe continuam exclusivas do titular.</p></section>
}
export function PermissionEditor({sections,grants,onChange,disabled=false}:PermissionEditorProps){
 const initial=matchedPermissionProfile(sections,grants)
 const [selected,setSelected]=useState(initial?.id??(Object.values(grants).some(row=>row?.read)?'custom':''))
 const groups=[...new Set(sections.map(row=>row.group))]
 const profiles=[...permissionProfiles(sections),{id:'custom',label:'Personalizado',description:'Combine as áreas e escolha o que a pessoa pode visualizar ou editar em cada seção.',icon:'settings' as const}]
 function all(ids:string[],level:'none'|'read'|'write'){onChange({...grants,...Object.fromEntries(ids.map(id=>[id,{read:level!=='none',write:level==='write'}]))})}
 return <div className={styles.permissions}>
 <div className={styles.intro}><h3>O que esta pessoa pode fazer?</h3><p>Escolha pela função da pessoa. Confira as áreas incluídas antes de confirmar.</p></div>
 <fieldset className={styles.profileOptions} disabled={disabled}><legend className={styles.srOnly}>Perfil de acesso</legend>{profiles.map(profile=><label key={profile.id} className={styles.profileOption} data-selected={selected===profile.id} data-tone={profile.id}><input type="radio" name="permission-profile" value={profile.id} checked={selected===profile.id} onChange={()=>{setSelected(profile.id);if(profile.id!=='custom')onChange(profileGrants(sections,profile.id))}}/><span className={styles.profileIcon}><ActionIcon name={profile.icon}/></span><span><strong>{profile.label}</strong><span>{profile.description}</span></span></label>)}</fieldset>
 {selected==='custom'?<><div className={styles.intro}><h3>Permissões por seção</h3><p>Abra uma categoria para ajustar. As escolhas de todas as categorias serão salvas juntas.</p></div><div className={styles.permissionScroll} role="region" aria-label="Categorias de permissões" tabIndex={0}>{groups.map((group,index)=>{
 const rows=sections.filter(row=>row.group===group)
 return <details key={group} className={styles.permissionGroup} open={index===0}><summary>{permissionGroupIcon(group)?<span className={styles.groupIcon}><ActionIcon name={permissionGroupIcon(group)!}/></span>:null}<span>{group}</span><span className={styles.groupCount}>{rows.filter(row=>grants[row.id]?.read).length} de {rows.length} liberadas</span><ActionIcon className={styles.disclosureArrow} name="down"/></summary><fieldset disabled={disabled}><legend className={styles.srOnly}>{group}</legend><div className={styles.sectionQuick}>{(['read','write','none'] as const).map(level=><button type="button" key={level} data-level={level} onClick={()=>all(rows.map(row=>row.id),level)}><ActionIcon name={level==='write'?'edit':level==='read'?'eye':'ban'}/>{level==='write'?'Editar categoria':level==='read'?'Visualizar categoria':'Sem acesso'}</button>)}</div><div className={styles.columnHead} aria-hidden="true"><span>Seção</span><span>Visualizar</span><span>Editar</span></div>{rows.map(row=><div className={styles.permissionRow} key={row.id}><strong>{row.label}</strong><label><input type="checkbox" aria-label={'Ler '+row.label} checked={grants[row.id]?.read===true} disabled={disabled||grants[row.id]?.write===true} onChange={event=>onChange({...grants,[row.id]:{read:event.target.checked,write:false}})}/><span className={styles.srOnly}>Visualizar</span></label><label><input type="checkbox" aria-label={'Escrever '+row.label} checked={grants[row.id]?.write===true} disabled={disabled} onChange={event=>onChange({...grants,[row.id]:{read:event.target.checked||grants[row.id]?.read===true,write:event.target.checked}})}/><span className={styles.srOnly}>Editar</span></label></div>)}</fieldset></details>
 })}</div><p className={styles.hint}>Editar mantém a visualização ativa. Você só pode compartilhar as áreas liberadas para sua conta.</p></>:selected?<PermissionSummary sections={sections} grants={grants}/>:<p className={styles.hint}>Selecione um perfil para começar. Você poderá conferir os acessos antes de confirmar.</p>}
 </div>
}
