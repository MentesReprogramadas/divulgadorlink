import { app } from './app'
import { env } from './env'

const start = async () => {
  try {
    await app.listen({ host: env.HOST, port: env.PORT })
    app.log.info(`Server is running on ${env.HOST}:${env.PORT} (${env.NODE_ENV})`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
