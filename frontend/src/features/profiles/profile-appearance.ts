export type ProfileAppearance = {
  searchEnabled?: boolean
  background: string; buttonColor: string
  backgroundStyle: 'solid' | 'gradient'
  buttonStyle: 'filled' | 'outline' | 'shadow'
  radius: 'square' | 'rounded' | 'pill'
  font: 'modern' | 'classic' | 'clean'
  alignment: 'center' | 'left'
}
export const defaultAppearance: ProfileAppearance = { searchEnabled: false, background: '#f5f0e8', buttonColor: '#252b27', backgroundStyle: 'solid', buttonStyle: 'filled', radius: 'rounded', font: 'modern', alignment: 'center' }
export const appearanceThemes: Array<{ name: string; appearance: ProfileAppearance }> = [
  { name: 'Areia', appearance: defaultAppearance },
  { name: 'Botânico', appearance: { ...defaultAppearance, background: '#173c32', buttonColor: '#d9efb6', radius: 'pill' } },
  { name: 'Lavanda', appearance: { ...defaultAppearance, background: '#ece5ff', buttonColor: '#523b85', buttonStyle: 'shadow' } },
  { name: 'Editorial', appearance: { ...defaultAppearance, background: '#f8f5ee', buttonColor: '#332b26', font: 'classic', radius: 'square', buttonStyle: 'outline', alignment: 'left' } },
  { name: 'Oceano', appearance: { ...defaultAppearance, background: '#123b63', buttonColor: '#d5edff', backgroundStyle: 'gradient', radius: 'pill' } },
  { name: 'Pêssego', appearance: { ...defaultAppearance, background: '#ffddc8', buttonColor: '#803a35', buttonStyle: 'shadow', font: 'clean' } },
]
export function readableInk(hex: string): '#000000' | '#ffffff' {
  const rgb = hex.match(/[a-f\d]{2}/gi)?.map(n => parseInt(n, 16) / 255) ?? [1, 1, 1]
  const [r, g, b] = rgb.map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4)
  const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000000' : '#ffffff'
}
/** Allowlisted values only, including for older publications with no appearance. */
export function profileAppearance(value?: Partial<ProfileAppearance>): ProfileAppearance {
  const result = { ...defaultAppearance }
  if (typeof value?.searchEnabled === 'boolean') result.searchEnabled = value.searchEnabled
  for (const key of ['background', 'buttonColor'] as const) if (/^#[0-9a-f]{6}$/i.test(value?.[key] ?? '')) result[key] = value![key]!
  for (const key of ['backgroundStyle', 'buttonStyle', 'radius', 'font', 'alignment'] as const) {
    const allowed = { backgroundStyle: ['solid', 'gradient'], buttonStyle: ['filled', 'outline', 'shadow'], radius: ['square', 'rounded', 'pill'], font: ['modern', 'classic', 'clean'], alignment: ['center', 'left'] }
    if (value?.[key] && allowed[key].includes(value[key]!)) Object.assign(result, { [key]: value[key] })
  }
  return result
}
