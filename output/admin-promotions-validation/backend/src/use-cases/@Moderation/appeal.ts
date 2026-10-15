export function appeal(input: { alreadyAppealed: boolean; text: string }): { status: 'PENDING_MODERATION' } {
  if (input.alreadyAppealed) throw new Error('contestação uma vez')
  if (!input.text.trim()) throw new Error('texto')
  return { status: 'PENDING_MODERATION' }
}
