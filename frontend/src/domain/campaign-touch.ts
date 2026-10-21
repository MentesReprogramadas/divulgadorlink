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
  return {
    source: input.source,
    medium: input.medium,
    campaign: input.campaign,
    // Optional labels must not erase an otherwise valid campaign or retain free text.
    content: TOUCH_OPTIONAL.test(input.content) ? input.content : '',
    term: TOUCH_OPTIONAL.test(input.term) ? input.term : '',
    landingPath: '/divulgar',
  }
}

export function campaignTouchFromUrl(url: URL): CampaignTouch | null {
  const params = url.searchParams
  const pathname = url.pathname === '/cadastro' && params.get('tla_landing') === '/divulgar'
    ? '/divulgar' : url.pathname
  return campaignTouch({
    pathname,
    source: params.get('utm_source') ?? '',
    medium: params.get('utm_medium') ?? '',
    campaign: params.get('utm_campaign') ?? '',
    content: params.get('utm_content') ?? '',
    term: params.get('utm_term') ?? '',
  })
}

export function campaignRegistrationHref(href: string, params: URLSearchParams): string {
  if (href !== '/cadastro') return href
  const touch = campaignTouchFromUrl(new URL('/divulgar?' + params, 'https://campaign.invalid'))
  if (!touch) return href
  const next = new URLSearchParams({ tla_landing: touch.landingPath })
  for (const key of ['source', 'medium', 'campaign', 'content', 'term'] as const) {
    if (touch[key]) next.set('utm_' + key, touch[key])
  }
  return href + '?' + next
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
