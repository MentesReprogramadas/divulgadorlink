'use client'
import {useEffect,useRef,useState} from 'react'
import {LoginForm} from '@/components/forms/login-form'
import {api} from '@/lib/api'
import {Button,ButtonLink} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import styles from './team.module.css'
import {selectWorkspace} from '@/features/workspace-team/workspace-access'
import {LiquidLens} from '@/components/ui/liquid-lens'
export function AcceptInvitation(){
 const [scope,setScope]=useState(''),[token,setToken]=useState(''),[error,setError]=useState(''),[pending,setPending]=useState(false),[resource,setResource]=useState(''),[login,setLogin]=useState(false),busy=useRef(false)
 useEffect(()=>{setToken(new URLSearchParams(window.location.search).get('token')??'');setScope(new URLSearchParams(window.location.search).get('scope')??'')},[])
 async function accept(){if(busy.current)return;busy.current=true;setPending(true);setError('');setLogin(false);try{if(scope==='workspace'){const response=await api<{ownerId?:string;message?:string}>('/v1/team/accept',{method:'POST',body:JSON.stringify({token})});if(response.status!==200||!response.body.ownerId){setLogin(response.status===401);throw new Error(response.body.message??'Não foi possível aceitar.')}history.replaceState(null,'','/equipe/convite');await selectWorkspace(response.body.ownerId);return}const response=await api<{message?:string;membership?:{resourceId:string}}>('/v1/invitations/accept',{method:'POST',body:JSON.stringify({token})});if(response.status!==200||!response.body.membership){setLogin(response.status===401);throw new Error(response.body.message??'Não foi possível aceitar.')}setResource(response.body.membership.resourceId);history.replaceState(null,'','/equipe/convite');setToken('')}catch(reason){setError(reason instanceof Error?reason.message:'Sem conexão. Tente novamente.')}finally{busy.current=false;setPending(false)}}
 return <main className={styles.card}><h1>Convite para colaborar</h1>{resource?<><p role="status">Convite aceito.</p><ButtonLink href={'/painel/equipe/'+resource+'/editar'}><ActionIcon name="teamAccess"/>Abrir página compartilhada</ButtonLink></>:<><p>Entre com o e-mail confirmado que recebeu o convite. Ao aceitar, a página aparecerá na sua equipe.</p><Button disabled={pending||!token} loading={pending} onClick={()=>void accept()}><ActionIcon name="teamAccess"/>Aceitar convite</Button>{error?<p role="alert">{error}</p>:null}{login?<><LoginForm returnTo={'/equipe/convite?'+(scope==='workspace'?'scope=workspace&':'')+'token='+encodeURIComponent(token)}/><p><a href="/esqueci-senha">Esqueci a senha</a> · <a href="/cadastro">Criar conta</a></p><p>Depois de confirmar seu e-mail ou recuperar a senha, abra novamente o link recebido.</p></>:null}</>}<LiquidLens radius={16}/></main>
}
