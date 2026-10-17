import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

export type ModerationCommand = { decision: 'APPROVE' | 'REJECT'; reference: string; reason: string | null }

export function safeText(value: string, limit = 300): string {
  // Remove control characters rather than allowing user text to add command lines.
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f*_~`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit)
}

export function parseCommand(raw: string): ModerationCommand | null {
  const match = /^(APROVAR|RECUSAR) ([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)(?: ([^\r\n]{1,500}))?$/.exec(raw.trim())
  if (!match) return null
  const reason = match[3] ? safeText(match[3], 500) : null
  if (match[1] === 'RECUSAR' && !reason) return null
  if (match[1] === 'APROVAR' && reason) return null
  return { decision: match[1] === 'APROVAR' ? 'APPROVE' : 'REJECT', reference: match[2]!, reason }
}

export function actionReference(id: string, secret: string): string {
  return `${id}.${createHmac('sha256', secret).update(`evolution.action.v1:${id}`).digest('base64url')}`
}

export function secretEquals(actual: string, expected: string): boolean {
  const a = Buffer.from(actual), b = Buffer.from(expected)
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b)
}

export function matchesReference(ref: string, id: string, secret: string): boolean {
  return secretEquals(ref, actionReference(id, secret))
}

const contextInfoSchema = z.object({
  stanzaId: z.string().min(1).max(200).optional(),
  isForwarded: z.boolean().optional(),
  forwardingScore: z.number().optional(),
}).passthrough()

const envelope = z.object({
  event: z.string(), instance: z.string(),
  data: z.object({
    key: z.object({ id: z.string().min(1).max(200), remoteJid: z.string(), fromMe: z.boolean(), participant: z.string().optional(), participantAlt: z.string().optional() }),
    messageTimestamp: z.union([z.number(), z.string()]),
    messageType: z.string().optional(),
    contextInfo: contextInfoSchema.nullish(),
    message: z.object({ conversation: z.string().max(1000).optional(), extendedTextMessage: z.object({ text: z.string().max(1000), contextInfo: contextInfoSchema.nullish() }).optional() }).passthrough(),
  }).passthrough(),
})

export function normalizePhoneJid(jid: string): string | null {
  if (!/^\d{10,15}(?::\d+)?@s\.whatsapp\.net$/.test(jid)) return null
  return jid.split('@')[0]!.split(':')[0]!
}

export function parseEvolutionMessage(raw: unknown, expected: { instance: string; group: string; now?: number }) {
  const parsed = envelope.safeParse(raw)
  if (!parsed.success) return null
  const row = parsed.data, data = row.data
  if (!['messages.upsert', 'MESSAGES_UPSERT'].includes(row.event) || row.instance !== expected.instance || data.key.remoteJid !== expected.group || data.key.fromMe) return null
  const age = (expected.now ?? Date.now()) - Number(data.messageTimestamp) * 1000
  if (!Number.isFinite(age) || age < -60_000 || age > 300_000) return null
  const extended = data.message.extendedTextMessage
  // Evolution normalizes Baileys replies to conversation + data.contextInfo.
  // Validate both representations, including forwarding flags, without trusting quoted text.
  const contexts = [data.contextInfo, extended?.contextInfo]
  if (contexts.some(context => context?.isForwarded || (context?.forwardingScore ?? 0) > 0)) return null
  const quotedIds = new Set(contexts.flatMap(context => context?.stanzaId ? [context.stanzaId] : []))
  if (quotedIds.size > 1) return null
  if (data.messageType && !['conversation', 'extendedTextMessage'].includes(data.messageType)) return null
  const text = data.message.conversation ?? extended?.text
  if (!text) return null
  // LID alone does not establish a phone identity. Only an explicit PN supplied by the trusted provider is admissible.
  const sender = normalizePhoneJid(data.key.participant ?? '') ?? normalizePhoneJid(data.key.participantAlt ?? '')
  const quotedMessageId = quotedIds.values().next().value ?? null
  // The quoted body is untrusted. Only the provider's message ID may identify a review.
  const reply = /^(APROVAR|RECUSAR)(?: ([^\r\n]{1,500}))?$/.exec(text.trim())
  const command = parseCommand(text) ?? (quotedMessageId && reply &&
    ((reply[1] === 'APROVAR' && !reply[2]) || reply[1] === 'RECUSAR')
    ? { decision: reply[1] === 'APROVAR' ? 'APPROVE' as const : 'REJECT' as const, reference: '', reason: reply[1] === 'RECUSAR' ? safeText(reply[2] ?? '', 500) || null : null } : null)
  if (!sender || !command) return null
  return { messageId: data.key.id, sender, command, quotedMessageId }
}
