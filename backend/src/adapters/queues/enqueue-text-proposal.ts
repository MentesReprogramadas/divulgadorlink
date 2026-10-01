import { Queue } from 'bullmq'
import Redis from 'ioredis'
import { env } from '@/env'

const QUEUE_NAME = 'divulgador-links'
export const TEXT_PROPOSAL_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1_000 },
}
const recorded: string[] = []
let queue: Queue | null = null

export function textProposalsForTest(): readonly string[] {
  return recorded
}

export function resetTextProposalsForTest(): void {
  recorded.length = 0
}

export async function enqueueTextProposal(linkId: string): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    recorded.push(linkId)
    return
  }
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }) })
  }
  try {
    await queue.add('text-proposed', { linkId }, {
      jobId: `text-${linkId}`,
      ...TEXT_PROPOSAL_JOB_OPTIONS,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (!message.includes('Job') && !message.includes('exists')) throw error
  }
}
