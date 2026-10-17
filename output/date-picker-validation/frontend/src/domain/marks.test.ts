import { describe, expect, it } from 'vitest'
import { allMarks, contrast, markFor, paint } from './marks'

describe('marcas de nicho e rede', () => {
  it('não repete cor nem ícone', () => {
    const marks = allMarks()
    expect(new Set(marks.map((mark) => mark.color)).size).toBe(marks.length)
    expect(new Set(marks.map((mark) => mark.icon)).size).toBe(marks.length)
  })

  it('mantém a cor da rede e o contraste do texto', () => {
    expect(markFor('network', 'telegram')?.color).toBe('#229ED9')
    expect(markFor('network', 'whatsapp')?.color).toBe('#25D366')
    for (const mark of allMarks()) {
      const tone = paint(mark.color)
      expect(contrast(tone.ink, tone.bg)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
