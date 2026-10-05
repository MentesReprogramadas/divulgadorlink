import './observability/register-hyperdx'
import { app } from './app'
import { env } from './env'
import { logDomainEvent } from './observability/logger'

const start = async () => {
  try {
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
