import { expect, it } from 'vitest'
import { appearanceThemes, defaultAppearance, profileAppearance, readableInk } from './profile-appearance'
it('old pages get defaults and arbitrary CSS never reaches theme variables', () => {
  expect(profileAppearance()).toEqual(defaultAppearance)
  expect(profileAppearance({ background: 'url(https://example.com)' })).toEqual(defaultAppearance)
})
it('all themes use legible contrasting text and preserve their choices', () => {
  for (const theme of appearanceThemes) expect(profileAppearance(theme.appearance)).toEqual(theme.appearance)
  expect(readableInk('#ffffff')).toBe('#000000'); expect(readableInk('#000000')).toBe('#ffffff')
})
it('automatic ink reaches 4.5:1 even for midtone custom colors', () => {
  for (let value = 0; value <= 255; value++) {
    const hex = '#' + value.toString(16).padStart(2, '0').repeat(3)
    const channel = value / 255
    const luminance = channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4
    const ratio = readableInk(hex) === '#ffffff' ? 1.05 / (luminance + .05) : (luminance + .05) / .05
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  }
})

it('search is off unless the owner explicitly enables it',()=>{expect(profileAppearance().searchEnabled).toBe(false);expect(profileAppearance({searchEnabled:true}).searchEnabled).toBe(true);expect(profileAppearance({searchEnabled:false}).searchEnabled).toBe(false)})
