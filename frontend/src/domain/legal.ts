const OPERATOR = 'CONTAVERA SOLUCOES INTELIGENTES LTDA'
const CNPJ = '66.421.121/0001-15'
const COMPANY_EMAIL = 'comercial@contavera.com'

function operator(contact: string | null): string {
  const extra = contact && contact !== COMPANY_EMAIL ? ` Também respondemos em ${contact}.` : ''
  return `A operadora é ${OPERATOR}, CNPJ ${CNPJ}. O contato é ${COMPANY_EMAIL}.${extra}`
}

export function legalPages(contact: string | null): { privacy: string; terms: string } {
  const who = operator(contact)
  const jurisdiction = 'Nós não controlamos o conteúdo, a oferta nem o que acontece depois que alguém abre o link. Esse destino está fora da jurisdição da plataforma.'
  return {
    privacy: [
      who,
      'Guardamos o e-mail e o telefone da conta enquanto ela existir. A senha fica só como hash. A moderação não aparece na página pública do link.',
      'Os eventos de analytics não guardam IP. Eles duram 12 meses e depois são apagados.',
      'Se você excluir a conta, o nome e os identificadores são anonimizados. O pedido de destaque permanece, sem identificador pessoal.',
      jurisdiction,
    ].join('\n\n'),
    terms: [
      who,
      'Publicar é grátis. O destaque é pago e só existe para um link já publicado. O envio passa por análise humana e pode ser recusado.',
      'Pode ser enviada uma URL https pública. Cada conta ocupa até 4 vagas ao mesmo tempo. Conteúdo ilegal é proibido.',
      jurisdiction,
    ].join('\n\n'),
  }
}
