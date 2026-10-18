'use client'
import {useSearchParams} from 'next/navigation'
import {profileEditorSection} from '../profile-editor-section'
import {ProfilePageSkeleton} from './profile-editor-skeleton'
export function ProfileRouteSkeleton(){
 const params=useSearchParams()
 return <ProfilePageSkeleton section={profileEditorSection(params.get('secao')??undefined)}/>
}
