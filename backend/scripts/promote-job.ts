import { Queue } from 'bullmq'
import Redis from 'ioredis'

async function main() {
  const jobId = process.argv[2]
  if (!jobId) throw new Error('uso: promote-job <jobId>')
  const connection = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6380', { maxRetriesPerRequest: null })
  const queue = new Queue('divulgador-links', { connection })
  try {
    const job = await queue.getJob(jobId)
    if (!job) throw new Error(`job ${jobId} não existe`)
    const state = await job.getState()
    if (state !== 'delayed') throw new Error(`job ${jobId} está ${state}, não delayed`)
    await job.promote()
    process.stdout.write(`promoted ${jobId}\n`)
  } finally {
    await queue.close()
    await connection.quit()
  }
}

main().catch((error) => {
  process.stderr.write(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
