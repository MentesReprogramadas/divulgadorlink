import { composeBillingE2e } from './e2e-billing-compose'
import {composePlatformWebhooksE2e} from './e2e-platform-webhooks'
import { startWorker } from '../src/worker'
composeBillingE2e()
composePlatformWebhooksE2e()
void startWorker()
