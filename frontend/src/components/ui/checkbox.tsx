'use client'
import type {InputHTMLAttributes} from 'react'
import {useReadOnly} from './interaction-policy'
import styles from './checkbox.module.css'

export function Checkbox({className,disabled,variant='default',...props}:Omit<InputHTMLAttributes<HTMLInputElement>,'type'> & {variant?:'default'|'page'}){
 const readOnly=useReadOnly()
 return <input {...props} type="checkbox" disabled={disabled||readOnly} className={[styles.checkbox,variant==='page'?styles.themed:'',className].filter(Boolean).join(' ')}/>
}
