import './observability/register-hyperdx'
import { app } from './app'
import { env } from './env'
import { prisma } from './lib/prisma'
import { logDomainEvent } from './observability/logger'

async function ensureTenant(): Promise<void> {
  const host = env.TENANT_HOST
  if (!host || host === 'localhost') return
  await prisma.tenant.upsert({
    where: { host },
    create: { host, name: env.TENANT_NAME },
    update: {},
  })
  logDomainEvent('tenant.ensured', { entity: host })
}

const start = async () => {
  try {
    await ensureTenant()
    await app.listen({ host: env.HOST, port: env.PORT })
    logDomainEvent('http.listening', {
      entity: `${env.HOST}:${env.PORT}`,
      tenant: env.NODE_ENV,
    })
  } catch (err) {
    const error = err instanceof Error ? err.stack ?? err.message : String(err)
    logDomainEvent('http.listen_failed', {
      entity: `${env.HOST}:${env.PORT}`,
      error,
    })
    process.exit(1)
  }
}

start()
