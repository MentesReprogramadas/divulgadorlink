import 'dotenv/config'
import { createRequire } from 'node:module'
import {
  hyperdxServiceName,
  isActuatorProbe,
  redisStatement,
  shouldRegisterHyperDX,
} from './hyperdx-config'

const require = createRequire(__filename)

if (shouldRegisterHyperDX(process.env)) {
  const apiKey = process.env.HDX_API_KEY?.trim() ?? ''
  const HyperDX = require('@hyperdx/node-opentelemetry') as typeof import('@hyperdx/node-opentelemetry')
  HyperDX.init({
    apiKey,
    service: hyperdxServiceName(process.argv, process.env.HDX_SERVICE_NAME),
    consoleCapture: false,
    advancedNetworkCapture: false,
    sentryIntegrationEnabled: false,
    experimentalExceptionCapture: true,
    instrumentations: {
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-net': { enabled: false },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingRequestHook: (request: { url?: string }) => isActuatorProbe(request.url),
      },
      '@opentelemetry/instrumentation-ioredis': {
        enabled: true,
        dbStatementSerializer: redisStatement,
      },
    },
  })
}
