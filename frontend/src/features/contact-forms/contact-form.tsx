'use client'
import {useRef,useState,type FormEvent} from 'react'
import {Field,Input,TextArea} from '@/components/ui/input'
import {Checkbox} from '@/components/ui/checkbox'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {contactRequest} from './contact-api'
import {contactFields,contactTitles,type ContactFormDescriptor} from './contact-contract'
import {contactFieldError,contactLimits,type ContactKey} from './contact-validation'
import styles from './contact.module.css'

export function ContactForm({form,slug,preview=false}:{form:ContactFormDescriptor;slug:string;preview?:boolean}){
 const [values,setValues]=useState<Record<string,string>>({}),[optIn,setOptIn]=useState(false),[errors,setErrors]=useState<Partial<Record<ContactKey,string>>>({}),[error,setError]=useState(''),[pending,setPending]=useState(false),[sent,setSent]=useState(false)
 const key=useRef<string|null>(null),honeypot=useRef<HTMLInputElement>(null),busy=useRef(false),message=useRef<HTMLParagraphElement>(null),element=useRef<HTMLFormElement>(null)
 function change(field:typeof form.definition.fields[number],value:string){key.current=null;setValues(previous=>({...previous,[field.key]:value}));setError('');setErrors(previous=>({...previous,[field.key]:previous[field.key]?contactFieldError(field,value):undefined}))}
 async function submit(event:FormEvent){
  event.preventDefault();if(preview||busy.current)return
  const invalid:Partial<Record<ContactKey,string>>={}
  for(const field of form.definition.fields){const reason=contactFieldError(field,values[field.key]??'');if(reason)invalid[field.key]=reason}
  setErrors(invalid)
  const first=Object.keys(invalid)[0];if(first){element.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();return}
  busy.current=true;setPending(true);setError('');key.current??=crypto.randomUUID()
  const answers=Object.fromEntries(form.definition.fields.map(field=>[field.key,(values[field.key]??'').trim()]))
  try{await contactRequest('/v1/profiles/'+encodeURIComponent(slug)+'/contact-form/submissions',{method:'POST',body:JSON.stringify({revisionId:form.revisionId,requestKey:key.current,answers,marketingOptIn:optIn,website:honeypot.current?.value??''})});setSent(true);requestAnimationFrame(()=>message.current?.focus())}
  catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível enviar. Tente novamente.')}
  finally{busy.current=false;setPending(false)}
 }
 if(sent)return <section className={styles.publicForm} aria-label="Formulário de contato"><h2>Contato enviado</h2><p role="status" ref={message} tabIndex={-1}>Sua mensagem foi recebida.</p></section>
 return <section className={styles.publicForm} aria-label="Formulário de contato"><h2>{contactTitles[form.definition.purpose]}</h2>{preview?<p role="status">Prévia: nenhum contato será enviado.</p>:null}<form ref={element} noValidate onSubmit={submit} className={styles.form}>{form.definition.fields.map(field=>{
  const common={name:field.key,required:field.required,maxLength:contactLimits[field.key],value:values[field.key]??'',disabled:pending,onChange:(event:{target:{value:string}})=>change(field,event.target.value),onBlur:()=>setErrors(previous=>({...previous,[field.key]:contactFieldError(field,values[field.key]??'')}))}
  return <Field align="center" key={field.key} label={contactFields[field.key]} error={errors[field.key]}>{field.key==='message'?<TextArea {...common}/>:<Input {...common} type={field.key==='email'?'email':field.key==='phone'?'tel':'text'} autoComplete={field.key==='name'?'name':field.key==='email'?'email':field.key==='phone'?'tel':field.key==='company'?'organization':'off'}/>}</Field>
 })}<div className={styles.honeypot} aria-hidden="true"><label>Seu website<input ref={honeypot} tabIndex={-1} autoComplete="off"/></label></div>{form.definition.marketingAllowed?<label className={styles.check}><Checkbox variant="page" checked={optIn} disabled={pending} onChange={e=>{key.current=null;setOptIn(e.target.checked)}}/>Quero receber novidades</label>:null}{error?<p role="alert">{error}</p>:null}<Button className={styles.submit} type="submit" disabled={pending||preview} loading={pending}><ActionIcon name="sendContact"/>Enviar contato</Button></form></section>
}
