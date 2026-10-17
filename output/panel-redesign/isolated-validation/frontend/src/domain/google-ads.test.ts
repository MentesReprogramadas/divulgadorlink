import { afterEach, describe, expect, it } from 'vitest'
import { GOOGLE_ADS_ID, installGoogleAds, setGoogleAdsConsent, trackGoogleAdsPageView } from './google-ads'

type TagWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }

function commands(): unknown[][] {
  return ((window as TagWindow).dataLayer ?? []).map(entry => Array.from(entry as ArrayLike<unknown>))
}

afterEach(() => {
  document.cookie = 'tla_consent=; Path=/; Max-Age=0'
  document.getElementById('google-ads-tag')?.remove()
  document.getElementById('test-nonce')?.remove()
  delete (window as TagWindow).dataLayer
  delete (window as TagWindow).gtag
})

describe('tag base do Google Ads', () => {
  it.each([null, 'denied'])('não carrega nem cria fila com consentimento %s', choice => {
    if (choice) document.cookie = `tla_consent=${choice}; Path=/`
    expect(installGoogleAds()).toBe(false)
    setGoogleAdsConsent(false)
    trackGoogleAdsPageView()
    expect(document.getElementById('google-ads-tag')).toBeNull()
    expect(commands()).toEqual([])
  })

  it('carrega o ID informado e define consentimento antes de configurar a tag', () => {
    document.cookie = 'tla_consent=marketing; Path=/'
    const nonceScript = document.createElement('script')
    nonceScript.id = 'test-nonce'
    nonceScript.nonce = 'nonce-test'
    document.head.appendChild(nonceScript)
    expect(installGoogleAds()).toBe(true)
    const script = document.getElementById('google-ads-tag') as HTMLScriptElement
    expect(script.src).toBe(`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`)
    expect(script.async).toBe(true)
    expect(script.nonce).toBe('nonce-test')
    expect(commands()).toEqual([
      ['consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }],
      ['js', expect.any(Date)],
      ['consent', 'update', { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' }],
      ['config', GOOGLE_ADS_ID],
    ])
    installGoogleAds()
    expect(document.querySelectorAll('#google-ads-tag')).toHaveLength(1)
    expect(commands()).toHaveLength(4)
  })

  it('rastreia navegação após o aceite e atualiza para denied ao retirar o consentimento', () => {
    document.cookie = 'tla_consent=marketing; Path=/'
    installGoogleAds()
    trackGoogleAdsPageView()
    expect(commands().at(-1)).toEqual(['event', 'page_view', {
      send_to: GOOGLE_ADS_ID, page_location: location.href, page_title: document.title,
    }])
    document.cookie = 'tla_consent=denied; Path=/'
    setGoogleAdsConsent(false)
    expect(commands().at(-1)).toEqual(['consent', 'update', {
      ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    }])
    const count = commands().length
    trackGoogleAdsPageView()
    expect(commands()).toHaveLength(count)
  })
})
