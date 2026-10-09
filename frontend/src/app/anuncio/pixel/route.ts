import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const consent = (await cookies()).get('tla_consent')?.value
  const pixelId = process.env.META_PIXEL_ID
  if (consent === 'marketing' && pixelId) {
    return NextResponse.json({ enabled: true, pixelId })
  }
  return NextResponse.json({ enabled: false })
}
