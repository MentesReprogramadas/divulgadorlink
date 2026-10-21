'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {useWorkspaceIdentity} from '@/features/workspace-team/workspace-access'
import {agencyRequest} from './agency-api'
/** Scope travels with the response; switching clients never paints the previous workspace. */
export function useAgencyData<T>(path:string,personal=false){
 const identity=useWorkspaceIdentity(),scope=personal?'self':identity?.ownerId??'self',sequence=useRef(0)
 const currentScope=useRef(scope);currentScope.current=scope
 const request=useCallback(<R,>(route:string,init?:RequestInit)=>agencyRequest<R>(route,{...init,headers:{...Object.fromEntries(new Headers(init?.headers)), 'x-workspace-owner':scope}},personal),[personal,scope])
 const [errorScope,setErrorScope]=useState('')
 const [state,setState]=useState<{scope:string;data:T}|null>(null),[error,setErrorValue]=useState(''),[loading,setLoading]=useState(true)
 const setError=useCallback((message:string)=>{setErrorScope(scope);setErrorValue(message)},[scope])
 const load=useCallback(async()=>{if(currentScope.current!==scope)return false;const id=++sequence.current;setLoading(true);setError('');try{const data=await request<T>(path);if(id===sequence.current)setState({scope,data});return true}catch(reason){if(id===sequence.current){if(reason instanceof Error&&'status' in reason&&(reason.status===403||reason.status===401))setState(null);setError(reason instanceof Error?reason.message:'Não foi possível carregar.')}return false}finally{if(id===sequence.current)setLoading(false)}},[path,scope,setError,request])
 useEffect(()=>{void load();return()=>{sequence.current++}},[load])
 const currentError=errorScope===scope?error:''
 return{scope,request,data:state?.scope===scope?state.data:null,error:currentError,setError,loading:loading||state?.scope!==scope&&!currentError,load,writable:identity!==null&&(!identity.ownerId||identity.grants?.agency?.write===true)}
}
