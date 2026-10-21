import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { campaignTouchFromUrl, touchDecision } from '@/domain/campaign-touch'

function paramsFrom(referer: string | null, host: string) {
  const empty = { pathname: '', source: '', medium: '', campaign: '', content: '', term: '' }
  if (!referer) return empty
  try {
    const url = new URL(referer)
    if (url.host !== host) return empty
    const touch = campaignTouchFromUrl(url)
    return touch ? { ...touch, pathname: touch.landingPath } : empty
  } catch {
    return empty
  }
}

export async function POST(request: Request) {
  const jar = await cookies()
  const decision = touchDecision({
    consent: jar.get('tla_consent')?.value,
    existing: jar.has('tla_touch'),
    ...paramsFrom(request.headers.get('referer'), request.headers.get('host') ?? new URL(request.url).host),
  })
  const response = NextResponse.json({ stored: decision.action === 'set' })
  if (decision.action === 'keep') return response
  response.cookies.set({
    name: 'tla_touch',
    value: decision.action === 'set' ? decision.value : '',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: decision.action === 'set' ? 2_592_000 : 0,
    secure: new URL(request.url).protocol === 'https:',
  })
  return response
}
