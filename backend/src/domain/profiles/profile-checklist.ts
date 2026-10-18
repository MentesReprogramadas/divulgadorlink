import type {ProfileContent} from './profile'
export type ChecklistState='COMPLETE'|'PENDING'|'SUGGESTED'|'REQUESTED'|'IN_REVIEW'|'REJECTED'
export type ChecklistStep={id:'account'|'identity'|'links'|'publication'|'presentation'|'preview'|'share';required:boolean;state:ChecklistState;title:string;description:string;actionLabel:string;actionPath:string|null;actionKind:'NAVIGATE'|'PREVIEW'|'PUBLISH'|'COPY'}
export type ProfileChecklist={profileVersion:number;canPublish:boolean;requiresFinalValidation:true;reasons:string[];publicPath:string|null;progress:{completed:number;total:number};steps:ChecklistStep[]}
export type ChecklistFacts={draft:(ProfileContent&{version:number})|null;publishedVersion:number|null;publishedSlug:string|null;review:{status:string;version:number}|null;canSubmit:boolean;publicationIssue:string|null;milestones:{previewRequested:boolean;linkCopied:boolean}}
/** Advisory projection of saved facts; never grants publishing authority. */
export function buildProfileChecklist(facts:ChecklistFacts):ProfileChecklist{
 const saved=Boolean(facts.draft),version=facts.draft?.version??0,current=saved&&facts.publishedVersion===version
 const review=facts.review?.version===version?facts.review.status:null
 const publication:ChecklistState=review==='PENDING'?'IN_REVIEW':review==='REJECTED'?'REJECTED':current?'COMPLETE':'PENDING'
 const publicPath=facts.publishedVersion!==null&&facts.publishedSlug?'/p/'+encodeURIComponent(facts.publishedSlug):null
 const links=saved&&!facts.publicationIssue,canPublish=saved&&facts.canSubmit&&links&&publication==='PENDING'
 const reasons=[...(!facts.canSubmit?['Confirme seu e-mail para publicar.']:[]),...(!saved?['Complete e salve a apresentação da página.']:[]),...(facts.publicationIssue?[facts.publicationIssue]:[]),...(publication==='IN_REVIEW'?['Aguarde a análise desta versão.']:publication==='REJECTED'?['Confira a recusa no editor para corrigir ou contestar.']:[])]
 const steps:ChecklistStep[]=[
  {id:'account',required:true,state:facts.canSubmit?'COMPLETE':'PENDING',title:'Confirmar a conta',description:facts.canSubmit?'Conta apta a solicitar publicação.':'Confirme seu e-mail para publicar.',actionKind:'NAVIGATE',actionLabel:'Verificar conta',actionPath:'/painel/verificar'},
  {id:'identity',required:true,state:saved?'COMPLETE':'PENDING',title:'Apresentação da página',description:saved?'Nome e endereço salvos.':'Escolha o nome e o endereço da sua página.',actionKind:'NAVIGATE',actionLabel:saved?'Editar apresentação':'Criar apresentação',actionPath:'/painel/perfil?secao=pagina'},
  {id:'links',required:true,state:links?'COMPLETE':'PENDING',title:'Preparar os links',description:facts.publicationIssue??(links?'Links salvos e conferidos na estrutura da página.':'Adicione pelo menos um link visível.'),actionKind:'NAVIGATE',actionLabel:'Revisar links',actionPath:'/painel/perfil?secao=links'},
  {id:'publication',required:true,state:publication,title:'Publicar página',description:publication==='COMPLETE'?'A versão salva está publicada.':publication==='IN_REVIEW'?'Esta versão está em análise humana.':publication==='REJECTED'?'Você pode corrigir ou contestar a decisão no editor.':'Publicar ainda valida a disponibilidade dos destinos e o conteúdo.',actionKind:publication==='PENDING'?'PUBLISH':'NAVIGATE',actionLabel:publication==='COMPLETE'?'Abrir página':publication==='IN_REVIEW'?'Acompanhar análise':publication==='REJECTED'?'Rever decisão':'Publicar página',actionPath:publication==='COMPLETE'?publicPath:publication==='PENDING'?null:'/painel/perfil'},
  {id:'presentation',required:false,state:facts.draft&&(Boolean(facts.draft.bio)||Boolean(facts.draft.avatarAssetId))?'COMPLETE':'SUGGESTED',title:'Personalizar a apresentação',description:'Foto e descrição são opcionais. Sua página pode ser publicada sem elas.',actionKind:'NAVIGATE',actionLabel:'Personalizar página',actionPath:'/painel/perfil?secao=pagina'},
  {id:'preview',required:false,state:saved&&facts.milestones.previewRequested?'REQUESTED':'SUGGESTED',title:'Conferir a prévia',description:'A prévia não comprova teste em todos os aparelhos. Confira também no seu celular.',actionKind:'PREVIEW',actionLabel:'Ver prévia',actionPath:saved?'/painel/perfil/previa':null},
  {id:'share',required:false,state:publicPath&&facts.milestones.linkCopied?'COMPLETE':'SUGGESTED',title:'Copiar o endereço da página',description:'Copiar não confirma que você enviou o link. Compartilhe onde preferir.',actionKind:'COPY',actionLabel:'Copiar link',actionPath:publicPath},
 ]
 return {profileVersion:version,canPublish,requiresFinalValidation:true,reasons,publicPath,progress:{completed:steps.filter(step=>step.required&&step.state==='COMPLETE').length,total:steps.filter(step=>step.required).length},steps}
}
