export type EmailBlock = { html: string; text: string }

export type EmailDocument = {
  brandName: string
  logoUrl: string
  logoUrlDark?: string
  preheader: string
  title: string
  blocks: EmailBlock[]
  footnote: string
}

const NAVY = '#0a192f'
const TURQUOISE = '#4af9eb'
const PAPER = '#f3f6f4'
const INK = '#14241c'
const MUTED = '#3e5148'
const LINE = '#d5ddd8'
const WHITE = '#ffffff'

const FONT = "'Source Sans 3','Segoe UI',Helvetica,Arial,sans-serif"

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function safeHref(href: string): string {
  if (!/^https?:\/\//i.test(href)) return ''
  return escapeHtml(href)
}

export function paragraph(text: string): EmailBlock {
  return {
    html: `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.45;color:${INK};">${escapeHtml(text)}</p>`,
    text,
  }
}

export function codeBlock(code: string): EmailBlock {
  return {
    html: `<p style="margin:8px 0 20px;font-family:${FONT};font-size:32px;font-weight:600;letter-spacing:0.28em;line-height:1.15;color:${NAVY};">${escapeHtml(code)}</p>`,
    text: code,
  }
}

export function action(href: string, label: string): EmailBlock {
  const url = safeHref(href)
  const safeLabel = escapeHtml(label)
  return {
    html: `<p style="margin:8px 0 20px;"><a href="${url}" style="display:inline-block;background:${NAVY};color:${WHITE};font-family:${FONT};font-size:16px;font-weight:600;line-height:1;text-decoration:none;border-radius:4px;padding:14px 16px;">${safeLabel}</a></p>`,
    text: url ? `${label}: ${href}` : label,
  }
}

export function detail(label: string, value: string): EmailBlock {
  return {
    html: `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.45;color:${INK};"><span style="color:${MUTED};">${escapeHtml(label)}</span><br>${escapeHtml(value)}</p>`,
    text: `${label}: ${value}`,
  }
}

function logoTag(src: string, alt: string): string {
  return `<img src="${src}" alt="${escapeHtml(alt)}" width="300" height="167" style="display:block;border:0;width:300px;max-width:100%;height:auto;">`
}

function headerLogo(input: EmailDocument): string {
  const src = safeHref(input.logoUrlDark || input.logoUrl)
  if (!src) return ''
  return logoTag(src, input.brandName)
}

export function renderEmail(input: EmailDocument): { html: string; text: string } {
  const logo = headerLogo(input)
  const brand = `<p style="margin:0;font-family:${FONT};font-size:20px;font-weight:600;line-height:1.15;color:${WHITE};">${escapeHtml(input.brandName)}</p>`
  const blocks = input.blocks.map((block) => block.html).join('')
  const text = [input.title, ...input.blocks.map((block) => block.text), input.footnote].join('\n\n')
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${WHITE};border:1px solid ${LINE};border-radius:4px;">
<tr><td class="email-header" align="center" bgcolor="${NAVY}" style="background:${NAVY};padding:8px 24px 12px;">
${logo || brand}
</td></tr>
<tr><td style="height:4px;background:${TURQUOISE};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:24px;">
<h1 style="margin:0 0 16px;font-family:${FONT};font-size:28px;font-weight:600;line-height:1.15;color:${INK};">${escapeHtml(input.title)}</h1>
${blocks}
</td></tr>
<tr><td style="padding:0 24px 24px;font-family:${FONT};font-size:14px;line-height:1.45;color:${MUTED};">${escapeHtml(input.footnote)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
  return { html, text }
}
