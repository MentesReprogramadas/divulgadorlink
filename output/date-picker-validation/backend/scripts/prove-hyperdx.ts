import { createServer } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'

const hits: string[] = []
const sink = createServer((req, res) => {
  hits.push(`${req.method} ${req.url}`)
  req.resume()
  req.on('end', () => {
    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    res.end('{}')
  })
})

async function main(): Promise<void> {
  await new Promise<void>((resolve) => sink.listen(4318, '127.0.0.1', resolve))
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://127.0.0.1:4318'
  process.env.OTEL_EXPORTER_OTLP_PROTOCOL = 'http/protobuf'
  process.env.OTEL_PROPAGATORS = 'tracecontext,baggage,jaeger'
  process.env.OTEL_BSP_SCHEDULE_DELAY = '200'
  const HyperDX = await import('@hyperdx/node-opentelemetry')
  HyperDX.init({ apiKey: 'smoke-key', service: 'divulgador-smoke' })
  const { context, propagation, trace } = await import('@opentelemetry/api')
  for (const header of ['%E0%A4%A', 'a:b', ':::', 'x'.repeat(10_000)]) {
    propagation.extract(context.active(), { 'uber-trace-id': header })
  }
  const tracer = trace.getTracer('smoke')
  tracer.startActiveSpan('smoke-span', (span) => span.end())
  for (let attempt = 0; attempt < 40 && !hits.some((hit) => hit.includes('/v1/traces')); attempt += 1) {
    await delay(250)
  }
  const shutdown = (HyperDX as { shutdown?: () => Promise<void> }).shutdown
  if (shutdown) await shutdown()
  sink.close()
  if (!hits.some((hit) => hit.includes('/v1/traces'))) {
    console.error(JSON.stringify({ result: 'no-export', hits }))
    process.exit(1)
  }
  console.info(JSON.stringify({ result: 'ok', hits: [...new Set(hits)] }))
  process.exit(0)
}

main().catch((error) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : 'falhou')
  process.exit(1)
})
