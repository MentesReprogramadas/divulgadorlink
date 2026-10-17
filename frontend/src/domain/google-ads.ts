export const GOOGLE_ADS_ID = 'AW-18513720323'
export const GOOGLE_ADS_LINK_CONVERSION = `${GOOGLE_ADS_ID}/uMyECICKtp4dEIPog_xE`
const SCRIPT_ID = 'google-ads-tag'

type GoogleTag = (...args: unknown[]) => void
type TagWindow = Window & { dataLayer?: unknown[]; gtag?: GoogleTag }

function marketingAccepted(): boolean {
  return document.cookie.split('; ').includes('tla_consent=marketing')
}

function consentState(granted: boolean) {
  const value = granted ? 'granted' : 'denied'
  return { ad_storage: value, analytics_storage: value, ad_user_data: value, ad_personalization: value }
}

export function setGoogleAdsConsent(granted: boolean): void {
  if (typeof window === 'undefined') return
  const host = window as TagWindow
  host.gtag?.('consent', 'update', consentState(granted))
}

export function installGoogleAds(): boolean {
  if (typeof window === 'undefined' || !marketingAccepted()) return false
  if (document.getElementById(SCRIPT_ID)) return true
  const host = window as TagWindow
  const dataLayer = host.dataLayer ??= []
  // eslint-disable-next-line prefer-rest-params -- gtag.js consumes Arguments objects.
  host.gtag ??= function () { dataLayer.push(arguments) }
  host.gtag('consent', 'default', consentState(false))
  host.gtag('js', new Date())
  setGoogleAdsConsent(true)
  host.gtag('config', GOOGLE_ADS_ID)

  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`
  const nonce = document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce
  if (nonce) script.nonce = nonce
  document.head.appendChild(script)
  return true
}

export function trackGoogleAdsPageView(): void {
  if (typeof window === 'undefined' || !marketingAccepted() || !document.getElementById(SCRIPT_ID)) return
  const host = window as TagWindow
  host.gtag?.('event', 'page_view', {
    send_to: GOOGLE_ADS_ID,
    page_location: window.location.href,
    page_title: document.title,
  })
}

export function trackGoogleAdsLinkSubmission(linkId: string): boolean {
  if (!linkId || !installGoogleAds()) return false
  const host = window as TagWindow
  host.gtag?.('event', 'conversion', {
    send_to: GOOGLE_ADS_LINK_CONVERSION,
    value: 1.0,
    currency: 'BRL',
    transaction_id: linkId,
  })
  return true
}
