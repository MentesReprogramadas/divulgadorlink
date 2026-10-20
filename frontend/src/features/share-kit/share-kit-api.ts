import {profileRequest,publicProfileRequest} from '@/features/profiles/profile-api'
import type {ProfileState} from '@/features/profiles/profile-contract'
import type {ShareKitOptions} from './share-kit-plan'
/** Read authorization first, then the real public projection, including age/visibility gates. */
export async function readShareKitState(source:ShareKitOptions['source']):Promise<ProfileState>{
 const state=await profileRequest<ProfileState>('')
 if(source==='draft'||!state.publishedContent||state.publishedVersion===null)return state
 const published=await publicProfileRequest(state.publishedContent.slug)
 if(published.restricted)throw new Error('Confirme a idade na página pública antes de gerar esta arte.')
 if(published.publishedRevisionId!==state.publishedVersion)throw new Error('A publicação mudou durante a consulta. Gere outra prévia.')
 return {...state,publishedContent:published}
}
