import { composeSearchForTest } from '../src/http/controllers/@Search/routes'
import { DeterministicTestEmbeddingService } from '../src/test-support/deterministic-test-embedding'

// Only this explicit E2E entry point replaces the external provider; SQL remains real.
composeSearchForTest({ embedding: () => new DeterministicTestEmbeddingService() })
void import('../src/server')
