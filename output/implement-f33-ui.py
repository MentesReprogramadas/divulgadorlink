from pathlib import Path
r=Path('C:/VSCODE/divulgadorlinks')
def put(p,s):
 p=r/p;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s,encoding='utf-8')
put('frontend/src/features/favorites/components/collection-publication.tsx',''' 'use client'
import {useRef,useState} from 'react'
import {Button,ButtonLink} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {OverlayDialog} from '@/components/ui/overlay-dialog'
import {Field,Input,Textarea} from '@/components/ui/input'
import {Checkbox} from '@/components/ui/checkbox'
import type {Collection} from '../favorites-contract'
import styles from './favorites.module.css'
type Publication={title:string;description:string;curator:string;requiresAge:boolean}
export function CollectionPublication({collection,pending,onSave}:{collection:Collection;pending:boolean;onSave:(path:string,method:string,body:unknown)=>Promise<void>}){
 const [open,setOpen]=useState(false),[error,setError]=useState(''),[saving,setSaving]=useState(false),busy=useRef(false)
 const current=collection.publication as Publication|undefined
 const [title,setTitle]=useState(current?.title??collection.name),[description,setDescription]=useState(current?.description??''),[curator,setCurator]=useState(current?.curator??''),[slug,setSlug]=useState(collection.slug??''),[requiresAge,setAge]=useState(current?.requiresAge??false)
 async function save(publish:boolean){if(busy.current)return;busy.current=true;setSaving(true);setError('');try{await onSave('collections/'+collection.id+(publish?'/publish':'/visibility'),publish?'POST':'PATCH',{expectedVersion:collection.version,...(publish?{title,description,curator,slug,requiresAge}:{visibility:'PRIVATE'})});setOpen(false)}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível salvar.')}finally{busy.current=false;setSaving(false)}}
 return <><div className={styles.actions}>{collection.visibility==='PUBLIC'&&collection.slug?<ButtonLink href={'/colecoes/'+collection.slug} variant="secondary"><ActionIcon name="external"/>Ver coleção pública</ButtonLink>:null}<Button disabled={pending} onClick={()=>setOpen(true)}><ActionIcon name="share"/>{collection.visibility==='PUBLIC'?'Configurar publicação':'Publicar coleção'}</Button></div><OverlayDialog open={open} title="Compartilhar coleção" onClose={()=>{if(!saving)setOpen(false)}}><form className={styles.form} onSubmit={e=>{e.preventDefault();void save(true)}}><p>Apenas os links aprovados desta seleção serão publicados. Novas adições exigem publicar novamente.</p>{error?<p role="alert">{error}</p>:null}<Field label="Título público" required><Input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={80}/></Field><Field label="Descrição"><Textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={500}/></Field><Field label="Nome do curador" required><Input value={curator} onChange={e=>setCurator(e.target.value)} required maxLength={80}/></Field><Field label="Endereço da coleção" required><Input value={slug} onChange={e=>setSlug(e.target.value)} disabled={Boolean(collection.slug)} required pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]" placeholder="comunidades-de-estudo"/><small>/colecoes/{slug||'seu-endereco'} · permanente após publicar</small></Field><label><Checkbox checked={requiresAge} onChange={e=>setAge(e.target.checked)}/>Conteúdo para maiores de 18 anos</label><div className={styles.actions}>{collection.visibility==='PUBLIC'?<Button type="button" variant="danger" disabled={saving} onClick={()=>void save(false)}><ActionIcon name="lock"/>Tornar privada</Button>:null}<Button type="submit" disabled={saving}><ActionIcon name="publish"/>{saving?'Salvando…':'Publicar seleção'}</Button></div></form></OverlayDialog></>
}
'''.lstrip())
p=r/'frontend/src/features/favorites/favorites-contract.ts';s=p.read_text().replace('version: number }','version: number; visibility?:string; slug?:string|null; publication?:{title:string;description:string;curator:string;requiresAge:boolean}|null; publishedRevision?:number|null }');p.write_text(s,encoding='utf-8')
p=r/'frontend/src/features/favorites/favorites-screen.tsx';s=p.read_text().replace("import { FavoriteCardsSkeleton", "import {CollectionPublication} from './components/collection-publication'\nimport { FavoriteCardsSkeleton");s=s.replace('    {confirmDelete && current ?',"    {current?<CollectionPublication key={current.id} collection={current} pending={pending} onSave={mutate}/>:null}\n    {confirmDelete && current ?");p.write_text(s,encoding='utf-8')
put('frontend/src/features/favorites/public-collection.tsx','''import {LinkRow} from '@/components/domain/link-row'
import {EmptyState} from '@/components/feedback/empty-state'
import styles from './components/favorites.module.css'
export type PublicCollection={restricted:false;title:string;description:string;curator:string;slug:string;publishedRevision:number;items:Array<{id:string;name:string;description:string;href:string;publisher:string;niche:{name:string;slug:string};network:{name:string;slug:string}}>}
export function PublicCollectionView({content}:{content:PublicCollection}){return <section className={styles.page} aria-label="Coleção pública"><header className={styles.collection}><h1>{content.title}</h1>{content.description?<p>{content.description}</p>:null}<p>Curadoria de <strong>{content.curator}</strong></p></header>{content.items.length?<ul className={styles.list}>{content.items.map(item=><li key={item.id} className={styles.item}><LinkRow {...item} placement="organic" showImpressions={false}/><small>{item.publisher}</small></li>)}</ul>:<EmptyState title="Sem links disponíveis" description="Os links voltam a aparecer quando estiverem disponíveis."/>}</section>}
''')
put('frontend/src/app/colecoes/[slug]/page.tsx','''import type {Metadata} from 'next'
import {cache} from 'react'
import {cookies,headers} from 'next/headers'
import {notFound} from 'next/navigation'
import {forward,tenantHost} from '@/lib/upstream'
import {ProfileAgeGate} from '@/features/profiles/profile-age-gate'
import {PublicCollectionView,type PublicCollection} from '@/features/favorites/public-collection'
export const dynamic='force-dynamic'
const load=cache(async(slug:string)=>{const h=await headers(),jar=await cookies();const result=await forward({method:'GET',path:'/api/v1/collections/'+encodeURIComponent(slug),host:tenantHost(h.get('host')??'localhost'),cookie:jar.get('age')?.value==='yes'?'age=yes':undefined,timeoutMs:10000});if([400,404].includes(result.status))return null;if(result.status!==200)throw new Error('Não foi possível carregar a coleção.');return JSON.parse(result.body.toString()) as PublicCollection|{restricted:true}})
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params,content=await load(slug);if(!content)notFound();return {title:content.restricted?'Conteúdo para maiores de 18 anos':content.title+' | Tem Link Aqui',description:content.restricted?undefined:content.description,robots:{index:false,follow:!content.restricted},alternates:{canonical:'https://'+tenantHost((await headers()).get('host')??'localhost')+'/colecoes/'+encodeURIComponent(slug)}}}
export default async function Page({params}:{params:Promise<{slug:string}>}){const content=await load((await params).slug);if(!content)notFound();return <main className="container" style={{paddingBlock:'var(--space-8)'}}>{content.restricted?<ProfileAgeGate/>:<PublicCollectionView content={content}/>}</main>}
''')
# use existing public-safe skeleton primitives; exact header/grid card shapes.
put('frontend/src/app/colecoes/[slug]/loading.tsx','''import {FavoriteCardsSkeleton} from '@/features/favorites/components/favorites-skeleton'
import {Skeleton} from '@/components/ui/skeleton'
export default function Loading(){return <main className="container" aria-label="Carregando coleção" aria-busy="true" style={{display:'grid',gap:'var(--space-6)',paddingBlock:'var(--space-8)'}}><div style={{padding:'var(--space-6)',display:'grid',gap:'var(--space-4)',border:'1px solid var(--border-default)',borderRadius:'var(--radius)'}}><Skeleton style={{height:36,width:'60%'}}/><Skeleton style={{height:24,width:'80%'}}/><Skeleton style={{height:24,width:'40%'}}/></div><FavoriteCardsSkeleton/></main>}
''')
