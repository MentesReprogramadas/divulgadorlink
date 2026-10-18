import { ProfileEditor } from '@/features/profiles/profile-editor'
import {profileEditorSection} from '@/features/profiles/profile-editor-section'
export default async function Page({searchParams}:{searchParams:Promise<{secao?:string|string[]}>}) { return <ProfileEditor initialSection={profileEditorSection((await searchParams).secao)}/> }
