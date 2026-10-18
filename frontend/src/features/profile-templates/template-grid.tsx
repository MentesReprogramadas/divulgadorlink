import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {readableInk} from '@/features/profiles/profile-appearance'
import type {ProfileTemplate} from './template-contract'
import styles from './templates.module.css'
export function TemplateGrid({templates,loading=false,disabled=false,onPreview}:{templates:ProfileTemplate[];loading?:boolean;disabled?:boolean;onPreview?:(template:ProfileTemplate,trigger:HTMLElement)=>void}){
  return <div className={styles.grid}>{templates.map(template=><article className={styles.card} data-loading={loading||undefined} key={template.versionId} aria-label={template.title}>
    <div className={styles.swatch} style={loading?undefined:{background:template.appearance.background,color:readableInk(template.appearance.background)}} aria-hidden="true"><ActionIcon name="templates"/><span className={styles.chip} style={loading?undefined:{background:template.appearance.buttonColor}}/><span className={styles.chip} style={loading?undefined:{background:template.appearance.buttonColor}}/></div>
    <h2><span className={loading?styles.ghost:undefined}>{template.title}</span></h2><p className={styles.description}><span className={loading?styles.ghost:undefined}>{template.description}</span></p><div className={styles.actions}><Button type="button" disabled={disabled||loading} onClick={onPreview?event=>onPreview(template,event.currentTarget):undefined}><span className={styles.buttonLabel} data-loading={loading||undefined}><ActionIcon name="preview"/>Ver modelo</span></Button></div>
  </article>)}</div>
}
