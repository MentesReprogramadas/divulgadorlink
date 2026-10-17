const NETWORK_LOGOS: Record<string, string> = {
  'discord': '/networks/discord.svg',
  'facebook': '/networks/facebook.svg',
  'instagram': '/networks/instagram.svg',
  'pinterest': '/networks/pinterest.svg',
  'reddit': '/networks/reddit.svg',
  'telegram': '/networks/telegram.svg',
  'threads': '/networks/threads.svg',
  'tiktok': '/networks/tiktok.svg',
  'twitch': '/networks/twitch.svg',
  'vimeo': '/networks/vimeo.svg',
  'whatsapp': '/networks/whatsapp.svg',
  'x': '/networks/x.svg',
  'youtube': '/networks/youtube.svg',
  'onlyfans': '/networks/onlyfans.svg',
  'kwai': '/networks/kwai.svg',
  'privacy': '/networks/privacy.svg',
  'fansly': '/networks/fansly.svg',
  'fatal-model': '/networks/fatal-model.svg',
  'linkedin': '/networks/linkedin.svg',
}

export function networkLogo(slug: string): string | null {
  return Object.hasOwn(NETWORK_LOGOS, slug) ? NETWORK_LOGOS[slug] : null
}
