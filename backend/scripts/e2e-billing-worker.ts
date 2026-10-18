import { composeBillingE2e } from './e2e-billing-compose'
import { startWorker } from '../src/worker'
composeBillingE2e()
void startWorker()
