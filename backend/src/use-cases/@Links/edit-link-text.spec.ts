import { describe, expect, it } from 'vitest'
import { editLinkText } from '@/use-cases/@Links/edit-link-text'

describe('edição', () => {
  it('lista fechada não publica e não chama IA', () => {
    const result = editLinkText({
      publishedName: 'Receitas', nextName: 'pix 11999999999', blocklisted: true, ai: 'PUBLISH',
    })
    expect(result.visibleName).toBe('Receitas')
    expect(result.ranAi).toBe(false)
  })

  it('IA que não passa mantém o texto aprovado', () => {
    expect(editLinkText({
      publishedName: 'Receitas', nextName: 'Bolos', blocklisted: false, ai: 'ADMIN',
    }).visibleName).toBe('Receitas')
  })

  it('IA que passa troca o texto visível', () => {
    expect(editLinkText({
      publishedName: 'Receitas', nextName: 'Bolos', blocklisted: false, ai: 'PUBLISH',
    }).visibleName).toBe('Bolos')
  })
})
