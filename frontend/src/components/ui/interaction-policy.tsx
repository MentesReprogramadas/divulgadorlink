'use client'
import {createContext,useContext,type ReactNode} from 'react'
const ReadOnly=createContext(false)
export function InteractionPolicy({readOnly,children}:{readOnly:boolean;children:ReactNode}){return <ReadOnly.Provider value={readOnly}>{children}</ReadOnly.Provider>}
export function useReadOnly(){return useContext(ReadOnly)}
