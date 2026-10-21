import {composeProfileHostsE2e} from './e2e-profile-hosts'
import {composePlatformWebhooksE2e} from './e2e-platform-webhooks'
import { composePublicContentProbeForTest } from '../src/use-cases/public-content-validation-ports'
import { probeAvailability } from '../src/adapters/http/availability-probe'
import { composeBillingE2e } from './e2e-billing-compose'
import { composeSearchForTest } from '../src/http/controllers/@Search/routes'
import { DeterministicTestEmbeddingService } from '../src/test-support/deterministic-test-embedding'
composeBillingE2e()
composePlatformWebhooksE2e()
composeProfileHostsE2e()
// These synthetic channel destinations never contact messaging services.
const channelFixtures = new Set(['https://t.me/comunidade-f37', 'https://chat.whatsapp.com/comunidade-f37', 'https://t.me/unified-community', 'https://chat.whatsapp.com/unified-updated', 'https://t.me/pending-unified', 'https://t.me/compact-invite'])
composePublicContentProbeForTest(async url => channelFixtures.has(url) ? 200 : probeAvailability(url))
composeSearchForTest({embedding:()=>{
  const deterministic=new DeterministicTestEmbeddingService()
  return {async embed(text:string){if(text==='FalhaBuscaFixture')throw new Error('Provider unavailable fixture');return deterministic.embed(text)}}
}})
void import('../src/server')
