import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { touchDecision } from '@/domain/campaign-touch'

function paramsFrom(referer: string | null) {
  const empty = { pathname: '', source: '', medium: '', campaign: '', content: '', term: '' }
  if (!referer) return empty
  try {
    const url = new URL(referer)
    return {
      pathname: url.pathname,
      source: url.searchParams.get('utm_source') ?? '',
      medium: url.searchParams.get('utm_medium') ?? '',
      campaign: url.searchParams.get('utm_campaign') ?? '',
      content: url.searchParams.get('utm_content') ?? '',
      term: url.searchParams.get('utm_term') ?? '',
    }
  } catch {
    return empty
  }
}

export async function POST(request: Request) {
  const jar = await cookies()
  const decision = touchDecision({
    consent: jar.get('tla_consent')?.value,
    existing: jar.has('tla_touch'),
    ...paramsFrom(request.headers.get('referer')),
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
