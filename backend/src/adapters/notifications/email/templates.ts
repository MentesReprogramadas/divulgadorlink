import { env } from '@/env'
import { action, type EmailBlock, paragraph, renderEmail, codeBlock, detail } from '@/adapters/notifications/email/html'

export type EmailBrand = { name: string; logoUrl: string; logoUrlDark?: string }

const EMAIL_LOGO_ON_NAVY = 'https://pub-852b31d202de4f9bb4000007a99abaf1.r2.dev/logo-dark-mode-removebg.png'

export type RenderedEmail = { subject: string; html: string; text: string }

export function nicheDigestEmail(input:{brand:EmailBrand;links:Array<{name:string;url:string}>;unsubscribeUrl:string;preferencesUrl:string}):RenderedEmail{
 return {subject:'Novidades nas categorias que você segue',...document({brand:input.brand,preheader:'Novos links para conhecer.',title:'Seu resumo de novidades',blocks:[...input.links.map(link=>action(link.url,link.name)),action(input.preferencesUrl,'Escolher categorias'),action(input.unsubscribeUrl,'Parar de receber resumos')],footnote:'Você ativou este resumo. Nenhum resultado é garantido.'})}
}

export function renewalReminderEmail(input: { brand: EmailBrand; linkName: string; surface: string; expiresAt: Date; summary: { from: string; to: string; impressions: number; clicks: number; dataState: string; coverage: string } | null; url: string; preferencesUrl: string }): RenderedEmail {
  const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(input.expiresAt)
  const surface = { SEARCH: 'Busca', NICHE: 'Categoria', HOME: 'Página inicial' }[input.surface] ?? input.surface
  const result = input.summary?.coverage === 'COMPLETE'
    ? `${input.summary.impressions} impressões e ${input.summary.clicks} cliques observados de ${input.summary.from} a ${input.summary.to}.`
    : 'O período tem cobertura incompleta. Consulte o relatório no painel.'
  return { subject: 'Seu destaque está perto de terminar', ...document({ brand: input.brand, preheader: 'Você decide se quer renovar.', title: 'Destaque perto do fim', blocks: [detail('Link', input.linkName), detail('Local', surface), detail('Encerra em', date + ' (São Paulo)'), paragraph(result), action(input.url, 'Ver renovação'), paragraph('Nenhuma cobrança automática. Confira o plano e confirme apenas se quiser renovar.'), action(input.preferencesUrl, 'Configurar lembretes')], footnote: 'Resultados observados não garantem resultados futuros.' }) }
}

export function availabilityEmail(input: { brand: EmailBrand; linkName: string; url: string }): RenderedEmail {
  return { subject: 'Seu link precisa de correção', ...document({ brand: input.brand, preheader: 'Revise o convite para voltar ao catálogo.', title: 'Link indisponível', blocks: [detail('Link', input.linkName), paragraph('O destino falhou em checagens repetidas e saiu do catálogo. O saldo de tempo dos destaques pagos foi pausado. Envie um novo convite para análise; o saldo será retomado após aprovarmos a correção.'), action(input.url, 'Corrigir convite')], footnote: 'Uma resposta acessível não confirma vagas no grupo.' }) }
}

export function siteOrigin(host?: string): string {
  const trimmed = host?.trim()
  if (trimmed) return `${env.NODE_ENV === 'production' ? 'https' : 'http'}://${trimmed}`
  return (env.APP_PUBLIC_URL ?? '').replace(/\/$/, '')
}

export function emailBrand(input: { name?: string; host?: string } = {}): EmailBrand {
  const name = input.name?.trim() || env.EMAIL_BRAND_NAME
  return { name, logoUrl: EMAIL_LOGO_ON_NAVY, logoUrlDark: EMAIL_LOGO_ON_NAVY }
}

function document(input: {
  brand: EmailBrand
  preheader: string
  title: string
  blocks: EmailBlock[]
  footnote: string
}): { html: string; text: string } {
  return renderEmail({
    brandName: input.brand.name,
    logoUrl: input.brand.logoUrl,
    logoUrlDark: input.brand.logoUrlDark,
    preheader: input.preheader,
    title: input.title,
    blocks: input.blocks,
    footnote: input.footnote,
  })
}

export function otpEmail(input: { brand: EmailBrand; code: string }): RenderedEmail {
  const body = document({
    brand: input.brand,
    preheader: 'Código para confirmar o e-mail. Vale por 1 hora.',
    title: 'Confirme seu e-mail',
    blocks: [
      paragraph('Use este código para confirmar o e-mail. Ele vale por 1 hora.'),
      codeBlock(input.code),
      paragraph('Se você não criou a conta, ignore este e-mail.'),
    ],
    footnote: input.brand.name,
  })
  return { subject: `${input.brand.name}: código para confirmar o e-mail`, ...body }
}

export function passwordResetEmail(input: { brand: EmailBrand; url: string }): RenderedEmail {
  const body = document({
    brand: input.brand,
    preheader: 'Link para criar outra senha. Vale por 30 minutos.',
    title: 'Criar outra senha',
    blocks: [
      paragraph('Você pediu para criar outra senha. O link vale por 30 minutos e só funciona uma vez.'),
      action(input.url, 'Criar outra senha'),
      paragraph('Se você não pediu isso, ignore este e-mail. A senha atual continua valendo.'),
    ],
    footnote: input.brand.name,
  })
  return { subject: `${input.brand.name}: criar outra senha`, ...body }
}

export type ModerationOutcome = 'published' | 'rejected' | 'change_rejected'

export function moderationEmail(input: {
  brand: EmailBrand
  linkName: string
  outcome: ModerationOutcome
}): RenderedEmail {
  const copy = {
    published: {
      title: 'Link publicado',
      text: 'O link foi publicado e já pode aparecer no catálogo.',
    },
    rejected: {
      title: 'Link não publicado',
      text: 'O link não foi publicado.',
    },
    change_rejected: {
      title: 'Alteração não aceita',
      text: 'A alteração não foi aceita. A versão que já estava no ar continua publicada.',
    },
  }[input.outcome]
  const body = document({
    brand: input.brand,
    preheader: copy.title,
    title: copy.title,
    blocks: [detail('Link', input.linkName), paragraph(copy.text)],
    footnote: input.brand.name,
  })
  return { subject: `${input.brand.name}: ${copy.title}`, ...body }
}

export function banEmail(input: { brand: EmailBrand; reason?: string }): RenderedEmail {
  const blocks = [
    paragraph('Sua conta foi suspensa. Você não pode enviar links nem alterar e-mail, telefone ou texto.'),
  ]
  if (input.reason?.trim()) blocks.push(detail('Motivo', input.reason.trim()))
  const body = document({
    brand: input.brand,
    preheader: 'Sua conta foi suspensa.',
    title: 'Conta suspensa',
    blocks,
    footnote: input.brand.name,
  })
  return { subject: `${input.brand.name}: conta suspensa`, ...body }
}

export function accountDeletedEmail(input: { brand: EmailBrand; name: string }): RenderedEmail {
  const body = document({
    brand: input.brand,
    preheader: 'Sua conta foi excluída.',
    title: 'Conta excluída',
    blocks: [
      paragraph(`${input.name}, a conta foi excluída.`),
      paragraph('O e-mail e o telefone saíram da conta. Não dá para entrar de novo com esta senha.'),
    ],
    footnote: input.brand.name,
  })
  return { subject: `${input.brand.name}: conta excluída`, ...body }
}
