import {ProfilePreviewScreen} from '@/features/profiles/profile-preview-screen'
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <ProfilePreviewScreen key={id}/>}
