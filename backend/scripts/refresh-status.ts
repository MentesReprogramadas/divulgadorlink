import { app } from '@/app'

async function main() {
  const token = process.argv[2]
  if (!token) throw new Error('token ausente')
  await app.ready()
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/refresh',
    headers: {
      host: 'tenant-a.localhost',
      cookie: `refreshToken=${token}; csrf=${'c'.repeat(32)}`,
      'x-csrf-token': 'c'.repeat(32),
    },
  })
  process.stdout.write(String(response.statusCode))
  await app.close()
}

main().then(() => process.exit(0)).catch((error) => {
  process.stderr.write(error instanceof Error ? error.stack ?? error.message : String(error))
  process.exit(1)
})
