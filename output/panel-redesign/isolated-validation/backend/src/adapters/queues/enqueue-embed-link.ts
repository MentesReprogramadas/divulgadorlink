import { Queue } from 'bullmq'
import { env } from '@/env'
import { createRedis } from '@/lib/redis'

export type EmbedLinkJobPayload = { linkId: string }

const QUEUE_NAME = 'divulgador-links'

type RecordedJob = { name: 'embed-link'; data: EmbedLinkJobPayload }

const testJobs: RecordedJob[] = []

let queue: Queue | null = null

function getQueue(): Queue {
  if (!queue) {
    const connection = createRedis(env.REDIS_URL, { maxRetriesPerRequest: null })
    queue = new Queue(QUEUE_NAME, { connection })
  }
  return queue
}

export type LinkEmbedSnapshot = {
  status: string
  name: string
  description: string
  networkId: string
  nicheId: string
}

export function shouldEnqueueEmbedLink(before: LinkEmbedSnapshot, after: LinkEmbedSnapshot): boolean {
  const becamePublished = before.status !== 'PUBLISHED' && after.status === 'PUBLISHED'
  const publishedFieldChange =
    after.status === 'PUBLISHED' &&
    (before.name !== after.name ||
      before.description !== after.description ||
      before.networkId !== after.networkId ||
      before.nicheId !== after.nicheId)
  return becamePublished || publishedFieldChange
}

export async function enqueueEmbedLink(linkId: string, intentId?: string): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    testJobs.push({ name: 'embed-link', data: { linkId } })
    return
  }
  await getQueue().add(
    'embed-link',
    { linkId, intentId },
    {
      jobId: intentId ?? `embed-${linkId}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: 100,
    },
  )
}

export function resetEmbedLinkJobsForTest(): void {
  if (process.env.NODE_ENV !== 'test') return
  testJobs.length = 0
}

export function getEmbedLinkJobsForTest(): readonly RecordedJob[] {
  return testJobs
}
