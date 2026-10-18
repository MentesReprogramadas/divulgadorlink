import { probeAvailability } from '@/adapters/http/availability-probe'
import { OpenAiTextModeration } from '@/adapters/moderation/openai-text-moderation'
import type { ModelVerdict } from '@/use-cases/@Links/proposed-text-decision'
import { env } from '@/env'
import type { ProfileModerationContext } from '@/domain/profiles/profile-moderation'
export type PublicContentValidationPorts = { probe: (url: string) => Promise<number | null>; judge: (text: { name: string; description: string; niche: string; profileContext?: ProfileModerationContext }) => Promise<ModelVerdict> }
export function publicContentValidationPorts(host: string): PublicContentValidationPorts {
  const moderation = env.OPENAI_API_KEY ? new OpenAiTextModeration(env.OPENAI_API_KEY) : null
  if (env.NODE_ENV === 'dev' && ['profiles.localhost', 'redirects.localhost', 'interaction.localhost', 'checklist.localhost', 'channels.localhost'].includes(host) && process.env.E2E_PROFILE_STUB_URL) {
    const target = new URL(process.env.E2E_PROFILE_STUB_URL)
    if (target.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(target.hostname)) return {
      probe: probeAvailability,
      judge: async text => { const r = await fetch(new URL('/profile-validation', target), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(text), signal: AbortSignal.timeout(10000) }); if (!r.ok) throw new Error('fixture unavailable'); return r.json() as Promise<ModelVerdict> },
    }
  }
  return { probe: probeAvailability, judge: async text => {
    if (!moderation) throw new Error('Validação automática indisponível.')
    return moderation.judgeProfile(text)
  } }
}
