'use client'
import {useState} from 'react'
import {ActionIcon} from '@/components/ui/action-icon'
import type {Grants} from './workspace-access'
import styles from './workspace-team.module.css'
export type PermissionSection={id:string;label:string;group:string}
type PermissionEditorProps={sections:PermissionSection[];grants:Grants;onChange:(grants:Grants)=>void;disabled?:boolean}
const profiles=[
 {id:'editor',label:'Editor de conteúdo',description:'Edita as seções de Conteúdo. As demais áreas ficam sem acesso.',icon:'edit'},
 {id:'reader',label:'Leitor de conteúdo',description:'Consulta as seções de Conteúdo, sem fazer alterações.',icon:'eye'},
 {id:'custom',label:'Personalizado',description:'Avançado: escolha o acesso a cada seção, incluindo outras áreas.',icon:'settings'},
] as const
function preset(sections:PermissionSection[],write:boolean):Grants{return Object.fromEntries(sections.map(row=>[row.id,{read:row.group==='Conteúdo',write:row.group==='Conteúdo'&&write}]))}
export function permissionProfile(sections:PermissionSection[],grants:Grants){
 for(const write of [true,false])if(sections.some(row=>row.group==='Conteúdo')&&sections.every(row=>Boolean(grants[row.id]?.read)===(row.group==='Conteúdo')&&Boolean(grants[row.id]?.write)===(row.group==='Conteúdo'&&write)))return write?'Editor de conteúdo':'Leitor de conteúdo'
 return 'Personalizado'
}
export function PermissionSummary({sections,grants}:{sections:PermissionSection[];grants:Grants}){
 const enabled=sections.filter(row=>grants[row.id]?.read)
 return <section className={styles.accessSummary} aria-label="Resumo das permissões"><div className={styles.summaryHeading}><strong>{permissionProfile(sections,grants)}</strong><span>{enabled.length} de {sections.length} seções com acesso</span></div>{enabled.length?<ul>{enabled.map(row=><li key={row.id}><span>{row.label}</span><strong>{grants[row.id]?.write?'Ver e editar':'Só visualizar'}</strong></li>)}</ul>:<p>Nenhuma seção liberada.</p>}<p className={styles.hint}>Seções que não aparecem nesta lista ficam sem acesso. Editar inclui visualizar e realizar as ações disponíveis na seção.</p></section>
}
export function PermissionEditor({sections,grants,onChange,disabled=false}:PermissionEditorProps){
 const initial=permissionProfile(sections,grants)
 const [selected,setSelected]=useState(initial==='Personalizado'?(Object.values(grants).some(row=>row?.read)?'custom':''):initial==='Editor de conteúdo'?'editor':'reader')
 const groups=[...new Set(sections.map(row=>row.group))]
 function all(ids:string[],level:'none'|'read'|'write'){onChange({...grants,...Object.fromEntries(ids.map(id=>[id,{read:level!=='none',write:level==='write'}]))})}
 return <div className={styles.permissions}>
 <div className={styles.intro}><h3>O que esta pessoa pode fazer?</h3><p>Escolha um perfil pronto ou personalize as permissões por seção.</p></div>
 <fieldset className={styles.profileOptions} disabled={disabled}><legend className={styles.srOnly}>Perfil de acesso</legend>{profiles.map(profile=><label key={profile.id} className={styles.profileOption} data-selected={selected===profile.id} data-tone={profile.id}><input type="radio" name="permission-profile" value={profile.id} checked={selected===profile.id} onChange={()=>{setSelected(profile.id);if(profile.id!=='custom')onChange(preset(sections,profile.id==='editor'))}}/><span className={styles.profileIcon}><ActionIcon name={profile.icon}/></span><span><strong>{profile.label}</strong><span>{profile.description}</span></span></label>)}</fieldset>
 {selected==='custom'?<><div className={styles.intro}><h3>Permissões por seção</h3><p>Abra uma categoria para ajustar. As escolhas de todas as categorias serão salvas juntas.</p></div><div className={styles.permissionScroll} role="region" aria-label="Categorias de permissões" tabIndex={0}>{groups.map((group,index)=>{
 const rows=sections.filter(row=>row.group===group)
 return <details key={group} className={styles.permissionGroup} open={index===0}><summary><span>{group}</span><span>{rows.filter(row=>grants[row.id]?.read).length} de {rows.length} liberadas</span><ActionIcon name="down"/></summary><fieldset disabled={disabled}><legend className={styles.srOnly}>{group}</legend><div className={styles.sectionQuick}>{(['read','write','none'] as const).map(level=><button type="button" key={level} onClick={()=>all(rows.map(row=>row.id),level)}>{level==='write'?'Editar categoria':level==='read'?'Visualizar categoria':'Sem acesso'}</button>)}</div><div className={styles.columnHead} aria-hidden="true"><span>Seção</span><span>Visualizar</span><span>Editar</span></div>{rows.map(row=><div className={styles.permissionRow} key={row.id}><strong>{row.label}</strong><label><input type="checkbox" aria-label={'Ler '+row.label} checked={grants[row.id]?.read===true} disabled={disabled||grants[row.id]?.write===true} onChange={event=>onChange({...grants,[row.id]:{read:event.target.checked,write:false}})}/><span className={styles.srOnly}>Visualizar</span></label><label><input type="checkbox" aria-label={'Escrever '+row.label} checked={grants[row.id]?.write===true} disabled={disabled} onChange={event=>onChange({...grants,[row.id]:{read:event.target.checked||grants[row.id]?.read===true,write:event.target.checked}})}/><span className={styles.srOnly}>Editar</span></label></div>)}</fieldset></details>
 })}</div><p className={styles.hint}>Editar mantém a visualização ativa. Áreas administrativas só aparecem quando sua conta pode delegá-las.</p></>:selected?<PermissionSummary sections={sections} grants={grants}/>:<p className={styles.hint}>Selecione um perfil para começar. Você poderá conferir os acessos antes de confirmar.</p>}
 </div>
}
