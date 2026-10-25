import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {useBillingAccess} from '@/features/profile-billing/billing-access'
import { ActionIcon } from '@/components/ui/action-icon'
import { profileEditorActions } from '../profile-editor-actions'
import type { ProfileContent } from '../profile-contract'
import type { ProfileEditorSection } from '../profile-editor-section'
import type { ProfileTool } from './profile-editor-toolbar'
import styles from './profile-overview.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'

const descriptions = {
 import:'Traga vários endereços para o rascunho.', templates:'Escolha um ponto de partida para sua página.',
 history:'Consulte versões anteriores da sua página.', metrics:'Acompanhe os resultados disponíveis.',
 checklist:'Confira o que falta e os próximos passos.', mediaKit:'Prepare a apresentação da página para parceiros.',
 campaigns:'Organize páginas para suas campanhas.', export:'Guarde uma cópia dos dados da sua página.',
} satisfies Record<Exclude<ProfileTool, 'preview'>, string>

type ProfileOverviewProps={
 collaborative?:boolean; content:ProfileContent; published:boolean; changed:boolean; pending:boolean; canSave:boolean
 reviewStatus?:string; sharing:ReactNode;onContacts?:()=>void
 onSection:(section:ProfileEditorSection)=>void; onAction:(action:ProfileTool)=>void
}
export function ProfileOverview({collaborative=false,content,published,changed,pending,canSave,reviewStatus,sharing,onSection,onAction,onContacts}:ProfileOverviewProps){
 const billing=useBillingAccess(),metricsLocked=Boolean(billing.state&&!billing.state.capabilities.includes('profile.analytics'))
 const status=reviewStatus==='PENDING'?'Em revisão humana':reviewStatus==='REJECTED'?'Versão recusada':published?(changed?'Alterações não publicadas':'Página publicada'):'Ainda não publicada'
 return <div className={styles.overview}>
  <div className={styles.summary}>
   <section className={styles.card} aria-label="Compartilhamento da página"><header><ActionIcon name="profile"/><h2>Sua página</h2></header><strong className={styles.pageName}>{content.name||'Sua página começa aqui'}</strong><p className={styles.status}>{status}</p>{sharing}<LiquidLens radius={16} /></section>
   <section className={styles.card} aria-label="Resumo do rascunho"><header><ActionIcon name="link"/><h2>Seu conteúdo</h2></header><dl className={styles.stats}><div><dt>Grupos no rascunho</dt><dd>{content.categories.length}</dd></div><div><dt>Links no rascunho</dt><dd>{content.items.length}</dd></div></dl><p className={styles.hint}>Alterações no rascunho só vão ao ar depois de publicar.</p><Button variant="secondary" disabled={pending} onClick={()=>onSection(content.name&&content.slug?'groups':'identity')}><ActionIcon name="edit"/>{content.name&&content.slug?'Editar grupos e links':'Começar minha página'}</Button><LiquidLens radius={16} /></section>
  </div>
  <section className={styles.shortcuts} aria-labelledby="profile-shortcuts-title"><div className={styles.sectionHeading}><h2 id="profile-shortcuts-title">O que você quer fazer?</h2><p>Ferramentas para preparar, organizar e acompanhar sua página.</p></div><div className={styles.grid}>
   {onContacts?<button type="button" className={styles.shortcut} disabled={pending} onClick={onContacts}><span className={styles.icon}><ActionIcon name="contactForm"/></span><span><strong>Receber mensagens</strong><span>Adicione ou ajuste o formulário de contato da sua página.</span></span><ActionIcon name="next"/><LiquidLens radius={16} /></button>:null}
   {!collaborative ? profileEditorActions.filter(tool=>tool.id!=='preview').map(tool=><button type="button" key={tool.id} className={styles.shortcut} disabled={pending||(tool.requiresDraft&&!canSave)} onClick={()=>onAction(tool.id)}><span className={styles.icon}><ActionIcon name={tool.id==='metrics'&&metricsLocked?'subscriptionLock':tool.icon}/></span><span><strong>{tool.label}</strong><span>{descriptions[tool.id]}</span></span><ActionIcon name="next"/><LiquidLens radius={16} /></button>) : null}
   <button type="button" className={styles.shortcut} disabled={pending} onClick={()=>onSection('appearance')}><span className={styles.icon}><ActionIcon name="appearance"/></span><span><strong>Personalizar aparência</strong><span>Ajuste as cores e o estilo da sua página.</span></span><ActionIcon name="next"/><LiquidLens radius={16} /></button>
  </div></section>
 </div>
}
