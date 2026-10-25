export async function syncCampaignTouch() {
  try {
    await fetch('/anuncio/toque', { method: 'POST', signal: AbortSignal.timeout(5_000) })
  } catch {
    // A measurement outage must not prevent consent or account creation.
  }
}
