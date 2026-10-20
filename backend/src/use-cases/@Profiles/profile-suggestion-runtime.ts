import {env} from '@/env'
import {OpenAiProfileSuggestion} from '@/adapters/profiles/openai-profile-suggestion'
import type {ProfileSuggestionPort} from './profile-suggestion-port'
export function profileSuggestionRuntime(host:string):ProfileSuggestionPort|null{
 if(env.NODE_ENV==='dev'&&['checklist.localhost','profiles.localhost'].includes(host)&&process.env.E2E_PROFILE_STUB_URL){const target=new URL(process.env.E2E_PROFILE_STUB_URL);if(target.protocol==='http:'&&['127.0.0.1','localhost'].includes(target.hostname)&&!target.username&&!target.password)return new OpenAiProfileSuggestion('fixture-suggestion-key',new URL('/profile-suggestions',target).href)}
 return env.OPENAI_API_KEY?new OpenAiProfileSuggestion(env.OPENAI_API_KEY):null
}
