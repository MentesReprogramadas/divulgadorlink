import { composeBillingE2e } from './e2e-billing-compose'
import { composeSearchForTest } from '../src/http/controllers/@Search/routes'
import { DeterministicTestEmbeddingService } from '../src/test-support/deterministic-test-embedding'
composeBillingE2e()
composeSearchForTest({embedding:()=>{
  const deterministic=new DeterministicTestEmbeddingService()
  return {async embed(text:string){if(text==='FalhaBuscaFixture')throw new Error('Provider unavailable fixture');return deterministic.embed(text)}}
}})
void import('../src/server')
