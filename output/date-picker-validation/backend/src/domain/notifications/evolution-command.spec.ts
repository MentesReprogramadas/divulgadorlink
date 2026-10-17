import { describe, expect, it } from 'vitest'
import { parseEvolutionMessage, parseCommand, actionReference, matchesReference, safeText } from './evolution-command'

describe('F42 comandos de moderação', () => {
  it('aceita resposta normalizada pela Evolution com contextInfo ao lado de message', () => {
    const payload = { event: 'messages.upsert', instance: 'test', data: {
      key: { id: 'inbound-normalized', remoteJid: 'test@g.us', participant: '12345678900000@lid', participantAlt: '5511999999999@s.whatsapp.net', fromMe: false },
      messageTimestamp: 1000, messageType: 'conversation',
      message: { conversation: 'APROVAR', messageContextInfo: {} },
      contextInfo: { stanzaId: 'sent-review-a', quotedType: 0, quotedMessage: { conversation: 'Texto citado nunca autoriza decisões' } },
    } }
    const expected = { instance: 'test', group: 'test@g.us', now: 1000_000 }
    expect(parseEvolutionMessage(payload, expected)).toMatchObject({ sender: '5511999999999', quotedMessageId: 'sent-review-a', command: { decision: 'APPROVE', reference: '', reason: null } })
    expect(parseEvolutionMessage({ ...payload, data: { ...payload.data, message: { conversation: 'RECUSAR Fora do tema' } } }, expected)).toMatchObject({ command: { decision: 'REJECT', reason: 'Fora do tema' } })
    for (const contextInfo of [null, {}, { quotedMessage: { conversation: 'APROVAR abc.def' } }, { stanzaId: 'sent-review-a', isForwarded: true }, { stanzaId: 'sent-review-a', forwardingScore: 1 }]) {
      expect(parseEvolutionMessage({ ...payload, data: { ...payload.data, contextInfo } }, expected)).toBeNull()
    }
    const conflicting = { ...payload, data: { ...payload.data, message: { extendedTextMessage: { text: 'APROVAR', contextInfo: { stanzaId: 'other-review' } } } } }
    expect(parseEvolutionMessage(conflicting, expected)).toBeNull()
  })
  it('F42-U01 exige comando exato e motivo para recusar', () => {
    expect(parseCommand('APROVAR abc.def')).toEqual({ decision: 'APPROVE', reference: 'abc.def', reason: null })
    expect(parseCommand('RECUSAR abc.def Fora do tema')).toEqual({ decision: 'REJECT', reference: 'abc.def', reason: 'Fora do tema' })
    expect(parseCommand('RECUSAR abc.def')).toBeNull()
    expect(parseCommand('olhe APROVAR abc.def')).toBeNull()
  })
  it('F42-U02/U03 ignora histórico, encaminhado e mensagens próprias', () => {
    const payload = { event: 'messages.upsert', instance: 'test', data: { key: { id: 'message', remoteJid: 'test@g.us', participant: '5511999999999@s.whatsapp.net', fromMe: false }, message: { conversation: 'APROVAR abc.def' }, messageTimestamp: 1000 } }
    expect(parseEvolutionMessage(payload, { instance: 'test', group: 'test@g.us', now: 1000_000 })).toMatchObject({ sender: '5511999999999', command: { decision: 'APPROVE' } })
    for (const variant of [
      { ...payload, event: 'messages.set' },
      { ...payload, data: { ...payload.data, key: { ...payload.data.key, fromMe: true } } },
      { ...payload, data: { ...payload.data, message: { extendedTextMessage: { text: 'APROVAR abc.def', contextInfo: { isForwarded: true } } } } },
    ]) expect(parseEvolutionMessage(variant, { instance: 'test', group: 'test@g.us', now: 1000_000 })).toBeNull()
    expect(parseEvolutionMessage(payload, { instance: 'test', group: 'other@g.us', now: 1000_000 })).toBeNull()
    expect(parseEvolutionMessage(payload, { instance: 'test', group: 'test@g.us', now: 2000_000 })).toBeNull()
  })
  it('F42-U04 vincula referência ao evento e segredo', () => {
    const ref = actionReference('case-id', 'secret')
    expect(matchesReference(ref, 'case-id', 'secret')).toBe(true)
    expect(matchesReference(ref, 'other-id', 'secret')).toBe(false)
    expect(matchesReference(ref, 'case-id', 'other-secret')).toBe(false)
  })
  it('F42-U05 exige identidade PN verificável e ignora texto citado', () => {
    const payload = { event: 'messages.upsert', instance: 'test', data: { key: { id: 'message', remoteJid: 'test@g.us', participant: '12345678900000@lid', fromMe: false }, message: { conversation: 'APROVAR abc.def' }, messageTimestamp: 1000 } }
    const expected = { instance: 'test', group: 'test@g.us', now: 1000_000 }
    expect(parseEvolutionMessage(payload, expected)).toBeNull()
    expect(parseEvolutionMessage({ ...payload, data: { ...payload.data, key: { ...payload.data.key, participantAlt: '5511999999999@s.whatsapp.net' } } }, expected)).toMatchObject({ sender: '5511999999999' })
    const quotedOnly = { ...payload, data: { ...payload.data, key: { ...payload.data.key, participant: '5511999999999@s.whatsapp.net' }, message: { extendedTextMessage: { text: 'Concordo', contextInfo: { quotedMessage: { conversation: 'APROVAR abc.def' } } } } } }
    expect(parseEvolutionMessage(quotedOnly, expected)).toBeNull()
  })
  it('F42-U06 limita texto e remove marcação e caracteres de controle', () => {
    expect(safeText('*Título*\nAPROVAR\u0000', 10)).toBe('Título APR')
  })
  it('aceita comandos curtos apenas com resposta explícita e nunca lê o corpo citado', () => {
    const expected = { instance: 'test', group: 'test@g.us', now: 1000_000 }
    const payload = (text: string, stanzaId?: string) => ({ event: 'messages.upsert', instance: 'test', data: { key: { id: 'inbound', remoteJid: 'test@g.us', participant: '5511999999999@s.whatsapp.net', fromMe: false }, messageTimestamp: 1000, message: { extendedTextMessage: { text, contextInfo: { stanzaId, quotedMessage: { conversation: 'APROVAR forged.reference' } } } } } })
    expect(parseEvolutionMessage(payload('APROVAR', 'outbound-a'), expected)).toMatchObject({ quotedMessageId: 'outbound-a', command: { decision: 'APPROVE', reference: '', reason: null } })
    expect(parseEvolutionMessage(payload('RECUSAR Fora do tema', 'outbound-b'), expected)).toMatchObject({ quotedMessageId: 'outbound-b', command: { decision: 'REJECT', reason: 'Fora do tema' } })
    for (const text of ['APROVAR', 'RECUSAR Fora do tema']) expect(parseEvolutionMessage(payload(text), expected)).toBeNull()
    expect(parseEvolutionMessage(payload('RECUSAR', 'outbound-a'), expected)).toMatchObject({ command: { decision: 'REJECT', reason: null } })
    for (const text of ['APROVAR tudo', 'ok', 'APROVAR\nRECUSAR motivo']) expect(parseEvolutionMessage(payload(text, 'outbound-a'), expected)).toBeNull()
  })
})
