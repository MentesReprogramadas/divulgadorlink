export type Mark = { color: string; icon: string }

const NETWORKS: Record<string, Mark> = {
  discord: { color: '#5865F2', icon: 'M3 8.5c1.4-1.2 2.8-2 4.4-2.4M13 8.5c-1.4-1.2-2.8-2-4.4-2.4M6.2 11.2a5 5 0 0 0 3.6 0M6.4 8.2h.1M9.6 8.2h.1M4 6.5C5.2 4.2 7.2 3 8 3s2.8 1.2 4 3.5c1.2 2.2 1.4 4.6.6 6.4-1 .4-2 .6-3 .6h-3.2c-1 0-2-.2-3-.6-.8-1.8-.6-4.2.6-6.4z' },
  facebook: { color: '#1877F2', icon: 'M9.2 13.5V8.6h1.6l.2-1.7H9.2V5.8c0-.5.1-.8.8-.8h1V3.4c-.2 0-.7-.1-1.4-.1-1.4 0-2.3.8-2.3 2.4v1.2H6.2v1.7h1.1v4.9h1.9z' },
  instagram: { color: '#E1306C', icon: 'M5 3.5h6A2.5 2.5 0 0 1 13.5 6v6A2.5 2.5 0 0 1 11 14.5H5A2.5 2.5 0 0 1 2.5 12V6A2.5 2.5 0 0 1 5 3.5zM8 10.4A2.4 2.4 0 1 0 8 5.6a2.4 2.4 0 0 0 0 4.8zM11.6 5.2h.1' },
  kwai: { color: '#FF4906', icon: 'M8 2.4c.4 1.6-.2 2.6-1 3.4-1.2 1.2-2 2.2-2 3.8a3 3 0 0 0 6 0c0-1-.4-1.8-1.2-2.8.8.4 1.2 1.2 1.2 2' },
  linkedin: { color: '#0A66C2', icon: 'M4.2 6.4h.1M3.4 8.2h1.6V13H3.4zM7 8.2h1.5v.7c.3-.5.9-.8 1.6-.8 1.2 0 2 .8 2 2.4V13H10.5v-2.2c0-.7-.2-1.2-.9-1.2s-1 .5-1 1.2V13H7z' },
  outro: { color: '#64748B', icon: 'M4 8h8M8 4v8' },
  pinterest: { color: '#E60023', icon: 'M8 2.6a2.4 2.4 0 0 0-1.4 4.4L8 13.2l1.4-6.2A2.4 2.4 0 0 0 8 2.6z' },
  reddit: { color: '#FF4500', icon: 'M11.6 5.2a1 1 0 1 0 .2-2 1 1 0 0 0-.2 2zM6.2 8.2h.1M9.8 8.2h.1M6.4 10.4c.8.7 2.4.7 3.2 0M5.2 5.6 8 4.2l.4 1.6M3.6 8.2a1.2 1.2 0 0 1 2.2.6 4.6 4.6 0 0 0 4.4 0 1.2 1.2 0 1 1 1.2 2.1 4.8 4.8 0 0 1-6.8 0 1.2 1.2 0 0 1-1-2.7z' },
  site: { color: '#475569', icon: 'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM2.8 8h10.4M8 2.6c1.4 1.6 2.1 3.4 2.1 5.4S9.4 11.8 8 13.4C6.6 11.8 5.9 10 5.9 8S6.6 4.2 8 2.6z' },
  telegram: { color: '#229ED9', icon: 'M3 8.2 13.2 3.4c.5-.2.9.2.8.7l-1.6 8.2c-.1.5-.6.7-1 .4L8.6 11 7.2 12.4c-.3.3-.7.1-.8-.3l-.4-2.2L3.6 9.2c-.5-.2-.5-.8-.6-1z' },
  threads: { color: '#000000', icon: 'M8 13.2c-2.4 0-4-1.5-4-3.6V8c0-2.6 1.8-4.6 4.4-4.6 2.2 0 3.8 1.2 4.2 3.2M6.2 8.2c.2 1.6 1.2 2.6 2.6 2.6 1.6 0 2.6-1 2.6-2.4 0-1.8-1.4-2.6-3.2-2.6' },
  tiktok: { color: '#25F4EE', icon: 'M10.2 3.2c.4 1.4 1.4 2.4 2.8 2.8v1.8A5 5 0 0 1 10 6.6v4.2a3.2 3.2 0 1 1-2.6-3.1' },
  twitch: { color: '#9146FF', icon: 'M4.2 2.8h9.2v7.2L10.6 13H8.2L6.6 11.4H4.2V2.8zM6.4 5.2v3.6M9.2 5.2v3.6' },
  vimeo: { color: '#1AB7EA', icon: 'M3.2 6.2C4.4 4.6 5.4 4 6.2 4c1.2 0 1.4 1.2 1.8 2.6.4 1.6.8 3.6 1.6 3.6.6 0 1.6-1.4 2.2-3 .2-.6.6-1.6 1.6-1.6.8 0 1.2.6 1.4 1.2' },
  whatsapp: { color: '#25D366', icon: 'M8 3.2a4.6 4.6 0 0 0-4 6.8L3.2 13l2.2-.6A4.6 4.6 0 1 0 8 3.2zM6.2 7.4c.2 1.6 1.6 3 3.2 3.4' },
  x: { color: '#111111', icon: 'M3.4 3.6 7.2 8.4 3.6 12.4h1.6l2.6-2.8 2.2 2.8h2.6L9 7.8l3.4-4.2H10.8L8.4 6.2 6.4 3.6H3.4z' },
  youtube: { color: '#FF0000', icon: 'M3 5.2h10A1.4 1.4 0 0 1 14.4 6.6v3.6A1.4 1.4 0 0 1 13 11.6H3A1.4 1.4 0 0 1 1.6 10.2V6.6A1.4 1.4 0 0 1 3 5.2zM7 6.8v3.2l2.6-1.6z' },
  onlyfans: { color: '#00AFF0', icon: 'M8 2.8a5.2 5.2 0 1 0 0 10.4 5.2 5.2 0 0 0 0-10.4zM8 5.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2z' },
  privacy: { color: '#FF2D87', icon: 'M5.2 7.2V5.4a2.8 2.8 0 0 1 5.6 0v1.8M4.2 7.2h7.6v5.2H4.2z' },
  fansly: { color: '#1B4DFF', icon: 'M8 3.4 9.2 6.6h3.2L10 8.6l.8 3.2L8 10l-2.8 1.8.8-3.2-2.4-2h3.2z' },
  'fatal-model': { color: '#7F1D1D', icon: 'M3.4 8.4c1.2-1.6 2.6-2.2 4.6-2.2s3.4.6 4.6 2.2c-1.2 1.6-2.6 2.4-4.6 2.4s-3.4-.8-4.6-2.4zM6.2 8.4h.1M9.8 8.4h.1' },
}

const NICHES: Record<string, Mark> = {
  'ganhar-dinheiro': { color: '#C4A035', icon: 'M8 2.8v10.4M5.4 4.6h3.6a1.8 1.8 0 0 1 0 3.6H6.2a1.8 1.8 0 0 0 0 3.6h4' },
  apostas: { color: '#7C3AED', icon: 'M4 3.5h8v9H4zM6.2 6.2h.1M9.8 6.2h.1M6.2 9.6h.1M9.8 9.6h.1M8 7.8h.1' },
  'compras-ofertas-cupons': { color: '#D97706', icon: 'M3.4 8.2 8 3.6h4.4V8L7.6 12.4 3.4 8.2zM10.4 6.2h.1' },
  'divulgacao-marketing': { color: '#DB2777', icon: 'M3.4 6.4h2.2l4.2-2.2v7.6L5.6 9.6H3.4zM11.2 6.4a2.4 2.4 0 0 1 0 3.2' },
  'filmes-series': { color: '#1E3A8A', icon: 'M3.2 5.2h9.6v6.4H3.2zM6 5.2 5 3.6M10 5.2l1-1.6M3.2 8h9.6' },
  streaming: { color: '#0F766E', icon: 'M2.8 4.2h10.4v6.2H2.8zM6.4 12.2h3.2M8 10.4v1.8M6.6 6.2v2.4l2.2-1.2z' },
  jogos: { color: '#65A30D', icon: 'M3.2 7.2h9.6v3.2a1.6 1.6 0 0 1-1.6 1.6H8.8L8 10.6 7.2 12H4.8a1.6 1.6 0 0 1-1.6-1.6V7.2zM5.2 8.6v1.6M4.4 9.4h1.6M10.4 8.8h.1M11.4 9.8h.1' },
  'servicos-ferramentas': { color: '#B45309', icon: 'M9.6 3.4a2.2 2.2 0 0 0-2.8 2.8L3.4 9.6l2 2 3.4-3.4a2.2 2.2 0 0 0 2.8-2.8L9.8 7.2 8.8 6.2z' },
  'tecnologia-internet': { color: '#0369A1', icon: 'M6.2 3.2h3.6v2.2H6.2zM6.2 10.6h3.6v2.2H6.2zM3.2 6.8h2.4v2.4H3.2zM10.4 6.8h2.4v2.4h-2.4zM8 5.4v1.4M4.4 6.8 6.2 5.6M11.6 6.8 9.8 5.6M8 9.2v1.4' },
  'educacao-cursos': { color: '#7C2D12', icon: 'M2.8 6.2 8 3.6l5.2 2.6L8 8.8 2.8 6.2zM5 7.6v2.4c1 .8 4 .8 6 0V7.6' },
  'saude-bem-estar': { color: '#BE185D', icon: 'M2.8 8.4h2.2L6.2 5.6l1.8 5.2 1.4-2.4h3.8' },
  'moda-beleza': { color: '#A21CAF', icon: 'M6.2 3.2h3.6l-.6 2.2h-2.4zM5.2 5.4h5.6l.8 7.4H4.4z' },
  'afiliados-monetizacao': { color: '#4D7C0F', icon: 'M5.2 4.2h.1M10.6 11.8h.1M4.4 11.6 11.6 4.4M6.4 11.2a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2zM9.6 8a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z' },
  'marketplace-vendas-diretas': { color: '#9A3412', icon: 'M3.2 6.4h9.6l-.8 6.4H4zM5.2 6.4 6 3.6h4l.8 2.8' },
  futebol: { color: '#166534', icon: 'M8 2.6a5.4 5.4 0 1 0 0 10.8A5.4 5.4 0 0 0 8 2.6zM8 5.2l1.6 1.2-.6 1.8H6.9L6.3 6.4zM6.3 6.4 4.6 7.2M9.6 6.4l1.8.8M6.9 8.2 6.2 10.2M9.1 8.2l.7 2' },
  musicas: { color: '#6D28D9', icon: 'M7 12.2a1.6 1.6 0 1 1-1.6-1.6c.3 0 .6.1.8.2V4.2l5-.8v6.2a1.6 1.6 0 1 1-1.6-1.6c.3 0 .6.1.8.2' },
  'entretenimento-geral': { color: '#B91C1C', icon: 'M3.4 8.2c0-2 1.2-3.6 2.6-3.6.8 0 1.4.6 2 .6s1.2-.6 2-.6c1.4 0 2.6 1.6 2.6 3.6S11.4 12 10 12c-.8 0-1.4-.8-2-1.2-.6.4-1.2 1.2-2 1.2-1.4 0-2.6-1.8-2.6-3.8z' },
  esportes: { color: '#0E7490', icon: 'M8 3.2 9.4 6.4 12.8 6.8 10.2 9l.8 3.4L8 10.8 5 12.4 5.8 9 3.2 6.8 6.6 6.4z' },
  'financas-investimentos': { color: '#1D4ED8', icon: 'M3.2 12.2 6.4 8.4l2 1.6 4.2-5M9.8 5h2.8v2.8' },
  'politica-sociedade': { color: '#44403C', icon: 'M3.2 12.6h9.6M4.2 12.6V7.2h7.6v5.4M8 3.2 13 7.2H3zM6.4 9.4h.1M9.6 9.4h.1' },
  'apps-redes-plataformas': { color: '#4338CA', icon: 'M3.4 3.4h3.6v3.6H3.4zM9 3.4h3.6v3.6H9zM3.4 9h3.6v3.6H3.4zM9 9h3.6v3.6H9z' },
  'animes-nerd-geek': { color: '#C026D3', icon: 'M4.2 9.2 8 3.6l3.8 5.6H4.2zM6.6 12.4h.1M9.4 12.4h.1' },
  'amizade-relacionamentos': { color: '#E11D48', icon: 'M5.2 6.2a1.6 1.6 0 0 1 2.8 1.2C8 6 8.6 5 9.6 5a1.8 1.8 0 0 1 1.6 2.8L8 11.4 4.8 8.2A1.6 1.6 0 0 1 5.2 6.2z' },
  'servicos-profissionais': { color: '#334155', icon: 'M6 6.2V4.8A1.2 1.2 0 0 1 7.2 3.6h1.6A1.2 1.2 0 0 1 10 4.8v1.4M3.6 6.2h8.8v6.2H3.6zM3.6 8.8h8.8' },
  adulto: { color: '#881337', icon: 'M8 2.8a5.2 5.2 0 1 0 0 10.4 5.2 5.2 0 0 0 0-10.4zM6.2 10.2V6.4L8 8.8l1.8-2.4v3.8' },
  outro: { color: '#78716C', icon: 'M8 3.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6zM8 7.2v.2M8 9.4h.1' },
}

export function markFor(kind: 'niche' | 'network', slug: string): Mark | null {
  const table = kind === 'niche' ? NICHES : NETWORKS
  return table[slug] ?? null
}

export function allMarks(): Mark[] {
  return [...Object.values(NETWORKS), ...Object.values(NICHES)]
}

function channel(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function luminance(hex: string): number {
  const convert = (part: number) => {
    const value = part / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  const [red, green, blue] = channel(hex)
  return 0.2126 * convert(red) + 0.7152 * convert(green) + 0.0722 * convert(blue)
}

function mix(hex: string, target: number, amount: number): string {
  const next = channel(hex).map((part) => Math.round(part + (target - part) * amount))
  return `#${next.map((part) => part.toString(16).padStart(2, '0')).join('')}`
}

export function contrast(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

export function paint(color: string): { ink: string; bg: string; border: string } {
  let ink = color
  const bg = luminance(color) < 0.04 ? color : mix(color, 255, 0.88)
  const border = luminance(color) < 0.04 ? color : mix(color, 255, 0.62)
  if (luminance(color) < 0.04) ink = '#ffffff'
  else {
    let shade = 0
    while (contrast(ink, bg) < 4.5 && shade < 0.75) {
      shade += 0.08
      ink = mix(color, 0, shade)
    }
  }
  return { ink, bg, border }
}
