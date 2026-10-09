# Pré-marketing — desenho para fechar a auditoria

Data: 2026-10-09.
Fonte: `docs/2026-10-09-auditoria-pre-marketing.md`.
Este documento não implementa código e não cria campanha.

## Decisão

Não reescrever a home de busca. A URL do anúncio é `/divulgar`. A home continua sendo o catálogo. O que a auditoria pede de mensuração mora no banco, não no Pixel. O Pixel só existe como espelho, desligado até você colar o identificador e o visitante consentir.

Três caminhos foram considerados:

1. **Trocar a home.** O h1 passa a falar com quem divulga e os chips de adulto e aposta saem da ordem. Custo: o único endereço orgânico muda de produto, e o revisor da Meta ainda cai no mesmo domínio se algum link interno sobrar. Rejeitado.
2. **Landing nova e home intocada.** `/divulgar` não lista faceta restrita e não linka a home. A home segue com a ordem atual. Custo: dois discursos no mesmo domínio. Quem clica no logo e vai para `/` vê adulto e aposta. Por isso o logo dessa URL não aponta para `/`. Escolhido.
3. **Esconder adulto e aposta no site inteiro.** Reduz o risco da conta de anúncios ao máximo e também apaga parte do catálogo para o orgânico. A auditoria pediu para não destruir o catálogo por causa do anúncio. Rejeitado.

## O que este programa resolve em código

| ID | Etapa | Resultado verificável |
|---|---|---|
| P-01 | 1 | `/divulgar` diz que publicar é grátis, que há análise humana e tem um botão |
| P-02 | 1 | Essa URL não nomeia nem linka adulto, aposta, ganhar dinheiro, Fansly, Fatal Model, OnlyFans, Privacy |
| P-12 | 1 | Em 390px a home não corta o nome do nicho e a página não rola na horizontal |
| P-13 | 1 | `/divulgar` tem título próprio e `og:image` gerada por rota |
| P-03 | 2 | `/privacidade` e `/termos` respondem 200 e o cadastro aponta para elas |
| P-04 | 3 | UTM do primeiro toque fica no usuário e no link; eventos de funil ficam no banco; sem Pixel não há request à Meta |
| P-06 | 4 | Conta nova vai para verificar ou para o formulário, não para o painel de métricas |
| P-07 | 4 | O formulário de cadastro não pede telefone |
| P-16 | 4 | Se o e-mail do código falhar, a conta criada nesse request é apagada e a tela não finge sucesso |
| P-08 | 5 | Host incompatível com `knownHosts` recebe 422 |
| P-10 | 5 | O POST 201 mostra “Enviado para análise”, nunca “Publicado” |
| P-11 | 5 | Dois cliques e a mesma URL canônica ativa geram um link |
| P-05, P-09 | 6 | Resumo longo não indexa faceta sem 3 links substantivos; `lastmod` da home não é “agora” |
| P-14 | 7 | Caso novo avisa os admins por e-mail. A IA de moderação continua desligada |
| P-15 | 7 | A resposta do Next manda HSTS, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` e CSP que não quebra o Stripe |
| cota, rascunho, URL viva, spam, paginação, expurgo de analytics | 5, 4, 6, 7 | Ver a etapa |

P-16 não estava na matriz e entra no escopo. O cadastro grava o usuário e só depois envia o código. Se o Resend falha, a API responde 503 e a conta já existe. A correção é apagar essa conta quando a entrega falha, antes de setar o cookie.

## O que não entra em código

Está em `docs/relatorios/2026-10-09-acoes-humanas-pre-marketing.md`.

- Redirect 301 de `www` para o apex. O DNS de `www` já responde 200.
- `VHG promo fitness #01` permanece. Não é teste.
- Colar `META_PIXEL_ID` (`2981954672158122`) e a chave da API de conversões só em variável de ambiente, nunca no git. O snippet cru da Meta não entra no layout.
- No dia em que o anúncio ligar, um admin aprova ou recusa a fila. Isso não é código.
- Revisar o texto legal com quem responde pela empresa.
- Não ligar a moderação automática.
- Não apagar pedido e pagamento por job. O prazo de 5 anos do spec de LGPD pode colidir com guarda fiscal. Analytics de 12 meses, sim, entra em código.

## Contrato de prova

Nenhuma etapa fecha com teste só escrito. Fecha quando o comando da etapa passa.

- Unitário de regra: `npx vitest run <arquivo>` no pacote dono da regra.
- Playwright: `npm run test:e2e` em `frontend`, que sobe Postgres e Redis de teste via Docker. Porta 3000, 3333 e 4099 livres. Se o Docker não estiver no ar, a etapa não está confirmada. Isso não vira “pula o E2E”.
- Se um teste antigo quebrar por causa da etapa, o conserto fica na mesma etapa. O caso conhecido é `frontend/e2e/mail.spec.ts`, que preenche telefone.
- Não há deploy neste programa. “Funcionando” significa suíte local verde, não produção.

## Regras que atravessam as etapas

- Publicar continua grátis. Cobrança continua só no destaque de link `PUBLISHED`.
- `decideSubmission` continua sem devolver `PUBLISHED`.
- Nenhum `queue.add('moderate-link')`.
- Não enviar e-mail, telefone, nome, senha, URL ou texto do link para analytics nem para a Meta.
- Texto de interface em português do Brasil, com reticências `…` onde a interface já pede estado de espera.
- Cookie de anúncio: primeiro toque ganha. Toque seguinte não sobrescreve.
- Faceta de idade e busca continuam `noindex`.

## Ordem

1 e 2 e 6 não dependem uma da outra. 3 antes de 4. 4 antes de 5. 7 pode ir depois de 1, porque os dois mexem em header e `next.config` e juntos evitam conflito de CSP com a página nova.

A landing sozinha não torna o anúncio seguro se o cadastro ainda pede telefone sem política. A ordem de execução recomendada é 2, 1, 3, 4, 5, 6, 7. 6 pode subir mais cedo se a pressa for parar de indexar página vazia.
