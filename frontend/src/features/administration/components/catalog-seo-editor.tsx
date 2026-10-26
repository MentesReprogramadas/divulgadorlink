'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, TextArea } from '@/components/ui/input'
import { api } from '@/lib/api'
import styles from './catalog-seo-editor.module.css'

type SeoText = { title: string; description: string; explicit: boolean; approved: boolean }
type SeoPreview = SeoText & { fingerprint: string }
type SeoCollection = SeoText & { slug: string; networkSlug: string | null; nicheSlug: string | null; linkIds?:string[] }
type SeoEditorial = { version: number; facets: Record<string, SeoText>; links: Record<string, SeoPreview>; collections: SeoCollection[] }
type FacetLists = { niches: Array<{slug:string;name:string}>; networks: Array<{slug:string;name:string}> }
const emptyText = (): SeoText => ({title:'',description:'',explicit:false,approved:false})

function TextFields({value,onChange,titleLabel='Título público',descriptionLabel='Descrição pública'}:{value:SeoText;onChange:(value:SeoText)=>void;titleLabel?:string;descriptionLabel?:string}) {
  return <>
    <Field label={titleLabel}><Input required maxLength={120} value={value.title} onChange={event=>onChange({...value,title:event.target.value,approved:false})} /></Field>
    <Field label={descriptionLabel}><TextArea required rows={5} maxLength={1000} value={value.description} onChange={event=>onChange({...value,description:event.target.value,approved:false})} /></Field>
    <label className={styles.choice}><Input type="checkbox" checked={value.explicit} onChange={event=>onChange({...value,explicit:event.target.checked,approved:false})} />Conteúdo sexual explícito</label>
    <p className={styles.copy}>Apostas ou outra restrição de idade não significam, por si só, conteúdo sexual. A classificação identifica o conteúdo público desta página.</p>
    <label className={styles.choice}><Input type="checkbox" checked={value.approved} onChange={event=>onChange({...value,approved:event.target.checked})} />Prévia pública revisada e aprovada</label>
  </>
}

export function CatalogSeoEditor() {
  const [state,setState]=useState<SeoEditorial|null>(null)
  const [facets,setFacets]=useState<FacetLists|null>(null)
  const [selection,setSelection]=useState('')
  const [draft,setDraft]=useState<SeoCollection|null>(null)
  const [linkSelection,setLinkSelection]=useState('')
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)

  async function load() {
    setLoading(true);setError('')
    try {
      const [editorial,options]=await Promise.all([api<SeoEditorial&{message?:string}>('/v1/admin/catalog-seo'),api<FacetLists>('/v1/admin/facets')])
      if(editorial.status!==200||options.status!==200)throw Error(editorial.body.message??'Não foi possível carregar o SEO editorial.')
      setState(editorial.body);setFacets(options.body)
    }catch(error){setError(error instanceof Error?error.message:'Não foi possível carregar o SEO editorial.')}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])

  function choose(value:string) {
    if(!state)return
    setSelection(value);setError('');setNotice('')
    if(value.startsWith('collection:')){
      const collection=state.collections.find(item=>item.slug===value.slice(11))!
      setDraft({...collection});setLinkSelection(collection.linkIds?.join('\n')??'')
    }
    else if(value.startsWith('facet:'))setDraft({...emptyText(),...state.facets[value.slice(6)],slug:'',networkSlug:null,nicheSlug:null})
    else setDraft(null)
  }
  async function save() {
    if(!state||!draft||saving)return
    setSaving(true);setError('');setNotice('')
    const collection=selection==='new'||selection.startsWith('collection:')
    const nextFacets={...state.facets}
    if(!collection)nextFacets[selection.slice(6)]={title:draft.title,description:draft.description,explicit:draft.explicit,approved:draft.approved}
    const linkIds=Array.from(new Set(linkSelection.split(/\r?\n/u).map(value=>value.trim()).filter(Boolean)))
    const nextCollections=collection?[...state.collections.filter(item=>item.slug!==draft.slug),{...draft,linkIds:linkIds.length?linkIds:undefined}]:state.collections
    try {
      const result=await api<SeoEditorial&{message?:string}>('/v1/admin/catalog-seo',{method:'PUT',body:JSON.stringify({expectedVersion:state.version,facets:nextFacets,collections:nextCollections})})
      if(result.status!==200){setError(result.body.message??'Não foi possível salvar. Seu texto foi mantido.');return}
      setState(result.body)
      if(collection)setSelection(`collection:${draft.slug}`)
      setNotice('SEO editorial salvo. A publicação depende também do inventário disponível e da política do catálogo; o Google decide a indexação.')
    }catch{setError('Não foi possível salvar. Seu texto foi mantido para tentar novamente.')}
    finally{setSaving(false)}
  }

  return <div className={styles.root}>
    <p className={styles.copy}>Organize páginas por intenção de busca, como ofertas, comunidades adultas, apostas e outros assuntos. Títulos e prévias são públicos; não inclua conteúdo restrito. Aprovar não garante posição no Google.</p>
    {loading?<p role="status">Carregando SEO editorial…</p>:state&&facets?<>
      <div className={styles.controls}>
        <Field label="Página editorial"><Select value={selection} onChange={event=>choose(event.target.value)}><option value="">Escolha uma página</option>{facets.networks.map(item=><option key={`network:${item.slug}`} value={`facet:network:${item.slug}`}>Rede: {item.name}</option>)}{facets.niches.map(item=><option key={`niche:${item.slug}`} value={`facet:niche:${item.slug}`}>Nicho: {item.name}</option>)}{state.collections.map(item=><option key={item.slug} value={`collection:${item.slug}`}>Coleção: {item.title}</option>)}</Select></Field>
        <Button variant="secondary" onClick={()=>{setSelection('new');setDraft({...emptyText(),slug:'',networkSlug:null,nicheSlug:null});setLinkSelection('');setNotice('');setError('')}}>Nova coleção</Button>
      </div>
      {draft?<form className={styles.form} onSubmit={event=>{event.preventDefault();void save()}}>
        {selection==='new'||selection.startsWith('collection:')?<>
          <Field label="Endereço da coleção" hint="Use letras minúsculas, números e hífens entre palavras. O endereço público será /descobrir/seu-endereco."><Input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} disabled={selection!=='new'} value={draft.slug} onChange={event=>setDraft({...draft,slug:event.target.value,approved:false})} /></Field>
          <div className={styles.filters}>
            <Field label="Rede da coleção"><Select value={draft.networkSlug??''} onChange={event=>setDraft({...draft,networkSlug:event.target.value||null,approved:false})}><option value="">Todas as redes</option>{facets.networks.map(item=><option key={item.slug} value={item.slug}>{item.name}</option>)}</Select></Field>
            <Field label="Nicho da coleção"><Select value={draft.nicheSlug??''} onChange={event=>setDraft({...draft,nicheSlug:event.target.value||null,approved:false})}><option value="">Todos os nichos</option>{facets.niches.map(item=><option key={item.slug} value={item.slug}>{item.name}</option>)}</Select></Field>
          </div>
          <p className={styles.copy}>Escolha pelo menos uma rede ou um nicho. A coleção lista somente anúncios elegíveis desses filtros.</p>
          <Field label="Links selecionados (opcional)" hint="Informe um ID por linha, até 200 anúncios publicados neste catálogo. Os filtros de rede e nicho continuam valendo. Deixe vazio para usar todos os anúncios elegíveis dos filtros."><TextArea rows={5} maxLength={16000} value={linkSelection} onChange={event=>{setLinkSelection(event.target.value);setDraft({...draft,approved:false})}} /></Field>
        </>:null}
        <TextFields value={draft} onChange={value=>setDraft({...draft,...value})} />
        <div className={styles.actions}><Button type="submit" loading={saving}>Salvar SEO</Button></div>
      </form>:null}
    </>:null}
    {error?<p role="alert">{error}</p>:null}
    {!loading&&error?<Button variant="secondary" onClick={()=>void load()}>Recarregar versão</Button>:null}
    <p className={styles.notice} role="status">{notice}</p>
    <form className={styles.form} action="/admin/moderacao" method="get">
      <h3>Revisar um link individual</h3>
      <Field label="ID do anúncio publicado" hint="O identificador está no endereço público /link/identificador."><Input name="link" required pattern="[a-zA-Z0-9_-]{1,80}" maxLength={80} /></Field>
      <div className={styles.actions}><Button type="submit" variant="secondary">Abrir prévia do anúncio</Button></div>
    </form>
  </div>
}

type LinkPreviewResponse = { version:number;preview:SeoPreview|null;name:string;description:string;requiresAge:boolean;message?:string }

export function LinkSeoEditor({linkId}:{linkId:string}) {
  const [state,setState]=useState<LinkPreviewResponse|null>(null)
  const [draft,setDraft]=useState<SeoText>(emptyText)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const endpoint=`/v1/admin/catalog-seo/links/${encodeURIComponent(linkId)}`
  async function load(){
    setLoading(true);setError('')
    try{
      const result=await api<LinkPreviewResponse>(endpoint)
      if(result.status!==200)throw Error(result.body.message??'Não foi possível carregar a prévia deste anúncio publicado.')
      setState(result.body);setDraft(result.body.preview??emptyText())
    }catch(error){setError(error instanceof Error?error.message:'Não foi possível carregar a prévia.')}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[endpoint])
  async function save(){
    if(!state||saving)return
    setSaving(true);setError('');setNotice('')
    try{
      const result=await api<SeoEditorial&{message?:string}>(endpoint,{method:'PUT',body:JSON.stringify({expectedVersion:state.version,title:draft.title,description:draft.description,explicit:draft.explicit,approved:draft.approved})})
      if(result.status!==200){setError(result.body.message??'Não foi possível salvar a prévia. Seu texto foi mantido.');return}
      setState({...state,version:result.body.version});setNotice('Prévia salva. Mudanças no anúncio exigem nova revisão antes da indexação.')
    }catch{setError('Não foi possível salvar a prévia. Seu texto foi mantido.')}
    finally{setSaving(false)}
  }
  return <section className={styles.root} aria-labelledby="link-seo-title">
    <h2 id="link-seo-title">Prévia pública para buscas</h2>
    <p className={styles.copy}>Revise somente o texto que pode aparecer publicamente, inclusive antes da confirmação de idade. Imagens e convites restritos ficam protegidos.</p>
    {loading?<p role="status">Carregando prévia…</p>:state?<form className={styles.form} onSubmit={event=>{event.preventDefault();void save()}}>
      <p>Anúncio: {state.name}</p>
      <TextFields value={draft} onChange={setDraft} titleLabel="Título da prévia" descriptionLabel="Resumo da prévia" />
      <div className={styles.actions}><Button type="submit" loading={saving}>Salvar prévia</Button></div>
    </form>:null}
    {error?<p role="alert">{error}</p>:null}
    {!loading&&error?<Button variant="secondary" onClick={()=>void load()}>Recarregar prévia</Button>:null}
    <p role="status" className={styles.notice}>{notice}</p>
  </section>
}
