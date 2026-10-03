import { describe, expect, it } from 'vitest'
import { action, codeBlock, escapeHtml, paragraph, renderEmail, safeHref } from '@/adapters/notifications/email/html'

const brand = {
  brandName: 'Tem Link Aqui',
  logoUrl: 'https://temlinkaqui.com/logo.svg',
  preheader: 'Código para confirmar',
  title: 'Confirme seu e-mail',
  footnote: 'Tem Link Aqui',
}

describe('html de e-mail', () => {
  it('monta o layout da marca e escapa o conteúdo', () => {
    const rendered = renderEmail({
      ...brand,
      blocks: [paragraph('Olá <script>'), codeBlock('000001'), action('https://temlinkaqui.com/recuperar-senha?token=abc', 'Criar outra senha')],
    })

    expect(rendered.html).toContain('lang="pt-BR"')
    expect(rendered.html).toContain('#0a192f')
    expect(rendered.html).toContain('#4af9eb')
    expect(rendered.html).toContain('#f3f6f4')
    expect(rendered.html).toContain('https://temlinkaqui.com/logo.svg')
    expect(rendered.html).toContain('bgcolor="#0a192f"')
    expect(rendered.html).not.toContain('prefers-color-scheme')
    expect(rendered.html).toContain('alt="Tem Link Aqui"')
    expect(rendered.html).not.toContain('email-brand')
    expect(rendered.html).toContain('&lt;script&gt;')
    expect(rendered.html).not.toContain('<script>')
    expect(rendered.html).toContain('000001')
    expect(rendered.text).toContain('Criar outra senha: https://temlinkaqui.com/recuperar-senha?token=abc')
  })

  it('recusa link que não é http', () => {
    expect(safeHref('javascript:alert(1)')).toBe('')
    expect(escapeHtml('"&')).toBe('&quot;&amp;')
    expect(action('javascript:alert(1)', 'Abrir').html).toContain('href=""')
  })

  it('usa só a logo de letras claras na faixa azul', () => {
    const rendered = renderEmail({
      ...brand,
      logoUrl: 'https://cdn.example/logo-clara.png',
      logoUrlDark: 'https://cdn.example/logo-escura.png',
      blocks: [],
    })
    expect(rendered.html).toContain('https://cdn.example/logo-escura.png')
    expect(rendered.html).not.toContain('https://cdn.example/logo-clara.png')
    expect(rendered.html).toContain('width="300"')
    expect(rendered.html).toContain('bgcolor="#0a192f"')
    expect(rendered.html.match(/Tem Link Aqui/g)).toEqual(['Tem Link Aqui', 'Tem Link Aqui'])
  })
  it('mostra o nome quando não há logo', () => {
    const rendered = renderEmail({ ...brand, logoUrl: '', blocks: [] })
    expect(rendered.html).not.toContain('<img')
    expect(rendered.html).toContain('Tem Link Aqui')
  })
})
