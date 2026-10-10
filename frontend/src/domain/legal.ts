const OPERATOR = 'CONTAVERA SOLUCOES INTELIGENTES LTDA'
const CNPJ = '66.421.121/0001-15'
const COMPANY_EMAIL = 'comercial@contavera.com'
const UPDATED = 'Atualizado em 10/10/2026.'

export type LegalSection = { title: string; paragraphs: string[] }
export type LegalDocument = { updated: string; sections: LegalSection[] }

function operator(contact: string | null): string {
  const extra = contact && contact !== COMPANY_EMAIL ? ` Também respondemos em ${contact}.` : ''
  return `A operadora é ${OPERATOR}, CNPJ ${CNPJ}. O contato é ${COMPANY_EMAIL}.${extra}`
}

const jurisdiction = 'Nós não controlamos o conteúdo, a oferta nem o que acontece depois que alguém abre o link. Esse destino está fora da jurisdição da plataforma.'

export function legalDocument(contact: string | null): { privacy: LegalDocument; terms: LegalDocument } {
  const who = operator(contact)
  return {
    privacy: {
      updated: UPDATED,
      sections: [
        {
          title: 'Quem trata',
          paragraphs: [
            who,
            'Este texto descreve o tratamento que o Tem Link Aqui faz hoje. Não há outro canal de privacidade: o e-mail acima recebe também pedido de acesso, correção, portabilidade e exclusão.',
          ],
        },
        {
          title: 'Conta',
          paragraphs: [
            'Guardamos o nome, o e-mail e, se você informar, o telefone, enquanto a conta existir. A senha fica só como hash bcrypt. A moderação não aparece na página pública do link.',
            'Se você excluir a conta, o nome e os identificadores são anonimizados. O pedido de destaque permanece, sem identificador pessoal. Não há prazo automático para apagar pedido.',
          ],
        },
        {
          title: 'Cookies de sessão',
          paragraphs: [
            'accessToken expira em 5 minutos e refreshToken em 7 dias. csrf e catalogo_role acompanham a sessão e o papel. São cookies de sessão, necessários para entrar e para o pedido não ser forjado.',
          ],
        },
        {
          title: 'Medição do catálogo',
          paragraphs: [
            'Os eventos de analytics não guardam IP nem user-agent. Guardam um identificador opaco de sessão, o link, a superfície, o dia e se foi impressão ou clique. Dono e admin não entram nessa contagem.',
            'Eles duram 12 meses e depois são apagados por um processo diário. O dia em que completam 12 meses permanece. Pedido e pagamento não entram nesse apagamento.',
          ],
        },
        {
          title: 'Campanha',
          paragraphs: [
            'O cookie tla_touch só é gravado depois do aceite. Ele guarda o primeiro acesso a /divulgar com parâmetros de campanha, por 30 dias. No cadastro, esse toque fica na conta e é copiado para o link enviado. Recusar apaga esse cookie.',
          ],
        },
        {
          title: 'Aviso de cookies',
          paragraphs: [
            'tla_consent guarda aceitar ou recusar por 365 dias. O Meta Pixel só carrega depois do aceite e pode gravar cookies do próprio Meta. Recusar não limita o catálogo. Você revê a escolha em Gerenciar cookies, na página de privacidade.',
          ],
        },
        {
          title: 'Eventos enviados à Meta',
          paragraphs: [
            'Só com o aceite, enviamos à Meta, pelo navegador e pelo servidor, o cadastro, o início e o envio de um link, a abertura do checkout, a escolha de Pix ou cartão e a compra do destaque. A compra leva valor, moeda, produto e método de pagamento.',
            'Junto vão o user-agent, os cookies _fbp e _fbc, o identificador da conta e o e-mail. Identificador e e-mail saem só como hash SHA-256, nunca em texto. Sem o aceite, nada disso é enviado.',
            'Para mandar a compra confirmada pelo provedor, o pedido guarda esse contexto do navegador até o pagamento. Ele é apagado no envio, ou em 7 dias se o pagamento não vier.',
          ],
        },
        {
          title: 'Pagamento, e-mail e texto',
          paragraphs: [
            'O destaque é cobrado por cartão na Stripe ou por Pix na Woovi. Não armazenamos número de cartão. O pedido guarda valor, status e o identificador do provedor.',
            'E-mail de verificação e de fila sai pela Resend. Na edição de um link já publicado, o texto pode ir à OpenAI para uma checagem automática. Um link novo não é publicado por essa checagem.',
          ],
        },
        {
          title: 'Finalidades',
          paragraphs: [
            'Criar e autenticar a conta, publicar o link, enviar e-mail transacional e cobrar o destaque se apoiam na execução do contrato. A medição sem IP se apoia no legítimo interesse de operar o catálogo. O primeiro toque de campanha e o Meta Pixel se apoiam no consentimento do aviso.',
            'Moderar o texto do link se apoia no legítimo interesse de manter o catálogo lícito.',
          ],
        },
        {
          title: 'Quem mais trata',
          paragraphs: [
            'Stripe trata o cartão. Woovi trata o Pix, no Brasil. Resend trata o e-mail. Meta trata o pixel, só depois do aceite. OpenAI trata o texto do link na edição e o embedding da busca. Não vendemos dado.',
            'Stripe, Resend, Meta e OpenAI podem tratar dado fora do Brasil. Pagamento, e-mail e a checagem do texto existem para executar o serviço. O pixel só segue com o aceite.',
          ],
        },
        {
          title: 'Prazos',
          paragraphs: [
            'A conta dura enquanto existir. A sessão segue os 7 dias do refresh. O toque de campanha dura 30 dias no navegador e, depois do cadastro, enquanto a conta existir. O aceite ou a recusa de cookies dura 365 dias. Analytics de sessão dura 12 meses. O contexto de compra para a Meta dura até 7 dias.',
          ],
        },
        {
          title: 'Direitos',
          paragraphs: [
            'Você pode confirmar o tratamento, acessar, corrigir, pedir a eliminação do que for desnecessário, pedir portabilidade e revogar o aceite do pixel. A exclusão da conta está em Conta, no painel, ou pelo e-mail do contato. O prazo de resposta é de 15 dias úteis.',
            jurisdiction,
          ],
        },
      ],
    },
    terms: {
      updated: UPDATED,
      sections: [
        {
          title: 'Quem opera',
          paragraphs: [who],
        },
        {
          title: 'Serviço',
          paragraphs: [
            'Publicar é grátis. O destaque é pago e só existe para um link já publicado. O envio passa por análise humana e pode ser recusado. Na edição do texto de um link já publicado, uma checagem automática pode manter a alteração no ar ou segurá-la para a mesma análise humana.',
            'Pode ser enviada uma URL https pública. Cada conta ocupa até 4 vagas ao mesmo tempo. Conteúdo ilegal é proibido. Identificador de conta já suspensa pode recusar o envio antes da fila.',
          ],
        },
        {
          title: 'Pagamento',
          paragraphs: [
            'O pagamento do destaque usa Stripe no cartão e Woovi no Pix. Não guardamos número de cartão. O valor pago não volta, salvo obrigação legal ou decisão da plataforma, que pode estornar.',
          ],
        },
        {
          title: 'Conduta',
          paragraphs: [
            'O cadastro é de quem tem 18 anos ou mais e informa dado verdadeiro. O telefone é opcional. A conta não se transfere. O que você publica continua sob sua responsabilidade.',
            'É proibido publicar conteúdo ilícito, violento, de exploração sexual, golpe, ódio ou material de terceiro sem autorização.',
          ],
        },
        {
          title: 'Conta',
          paragraphs: [
            'A conta pode ser suspensa e o link tirado do ar. Você pode excluir a conta no painel. Estes termos são regidos pelas leis da República Federativa do Brasil.',
            'Dúvida de conta, pagamento ou dado pessoal vai para o e-mail do contato. Cookies de sessão e o pixel estão na política de privacidade.',
            jurisdiction,
          ],
        },
      ],
    },
  }
}

function flat(document: LegalDocument): string {
  return [document.updated, ...document.sections.flatMap((section) => [section.title, ...section.paragraphs])].join('\n\n')
}

export function legalPages(contact: string | null): { privacy: string; terms: string } {
  const documents = legalDocument(contact)
  return { privacy: flat(documents.privacy), terms: flat(documents.terms) }
}
