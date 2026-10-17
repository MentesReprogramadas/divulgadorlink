const TOUCH_TOKEN = /^[a-zA-Z0-9._~-]{1,80}$/
const TOUCH_OPTIONAL = /^[a-zA-Z0-9._~-]{0,80}$/

export type CampaignTouch = {
  source: string
  medium: string
  campaign: string
  content: string
  term: string
  landingPath: '/divulgar'
}

export function campaignTouch(input: {
  pathname: string
  source: string
  medium: string
  campaign: string
  content: string
  term: string
}): CampaignTouch | null {
  if (input.pathname !== '/divulgar') return null
  if (!TOUCH_TOKEN.test(input.source) || !TOUCH_TOKEN.test(input.medium) || !TOUCH_TOKEN.test(input.campaign)) return null
  if (!TOUCH_OPTIONAL.test(input.content) || !TOUCH_OPTIONAL.test(input.term)) return null
  return {
    source: input.source,
    medium: input.medium,
    campaign: input.campaign,
    content: input.content,
    term: input.term,
    landingPath: '/divulgar',
  }
}

export type TouchDecision =
  | { action: 'keep' }
  | { action: 'clear' }
  | { action: 'set'; value: string }

export function touchDecision(input: {
  consent: string | undefined
  existing: boolean
  pathname: string
  source: string
  medium: string
  campaign: string
  content: string
  term: string
}): TouchDecision {
  if (input.consent === 'denied') return input.existing ? { action: 'clear' } : { action: 'keep' }
  if (input.consent !== 'marketing' || input.existing) return { action: 'keep' }
  const touch = campaignTouch(input)
  if (!touch) return { action: 'keep' }
  return { action: 'set', value: JSON.stringify(touch) }
}
