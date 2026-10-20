import {ProfileEditor} from '@/features/profiles/profile-editor'
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <ProfileEditor key={id} collaborative resourceId={id}/>}
