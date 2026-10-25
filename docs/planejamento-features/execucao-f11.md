# F11 — Planos para páginas

## Configuração operacional — 25/10/2026

O responsável autorizou a conta Stripe real, a definição dos preços e confirmou a revisão fiscal. Produtos e preços recorrentes foram criados; a disponibilidade no painel ainda deve ser confirmada após publicar a versão validada.

A imagem da API inclui uma rotina administrativa para configurar os dois planos usando as mesmas validações, versões e auditoria do painel. Ela exige produção, chave real, conta Stripe correspondente, administrador ativo do site e confirmação fiscal explícita. Não cria clientes, assinaturas ou cobranças. Repetir a mesma configuração preserva as versões existentes.

```sh
node build/scripts/configure-profile-plans.js --apply --fiscal-reviewed --host "$SITE_HOST" --admin-email "$ADMIN_EMAIL" --stripe-account "$STRIPE_ACCOUNT" --pro-price "$PRO_PRICE_ID" --pro-cents "$PRO_CENTS" --premium-price "$PREMIUM_PRICE_ID" --premium-cents "$PREMIUM_CENTS"
```

Executar dentro do container da API após as migrações, com as três variáveis de assinaturas já configuradas. A rotina mantém o subdomínio fora do Premium quando esse recurso não está entregue no ambiente. A confirmação fiscal não ativa cálculo automático de impostos nem altera o webhook de pagamentos avulsos.

A conta Contavera utiliza `checkout.contavera.com` como [domínio próprio do Stripe Checkout](https://docs.stripe.com/payments/checkout/custom-domains). Backend e frontend aceitam somente essa origem HTTPS e a origem padrão `checkout.stripe.com`, preservando a restrição a `/c/pay/`, sem credenciais ou portas alternativas. Os testes de fronteira e do SDK cobrem as duas origens; o provedor local do E2E usa o domínio da Contavera.

A revisão desta compatibilidade passou nos 26 testes unitários afetados e nos 17 E2E de assinatura em desktop/mobile. Dois checkouts em modo real devolveram os valores configurados e páginas HTTP 200; ambos foram encerrados sem pagamento, e o cliente temporário foi removido. Os eventos de encerramento chegaram ao webhook habilitado, sem entregas pendentes. Esse ensaio não comprova liquidação de um pagamento real; confirmação, renovação e cancelamento continuam cobertos pelos testes com provedor isolado.

Registro de 17/10/2026: **VALIDADA LOCALMENTE; S0–S6 concluídas, S7 remoto/comercial EM REVISÃO.** A implementação local foi autorizada pelo usuário; a publicação e a configuração comercial receberam autorização em 25/10/2026, conforme atualização acima.

## Decisões e alternativas — 17/10/2026

- Preservar todo o editor, grupos, cores, botões, foto e histórico hoje disponíveis gratuitamente. Alternativa: restringir retroativamente a personalização como proposta originalmente; descartada porque contradiz a experiência premium já solicitada e implementada. Não reduzir quotas de publicação como efeito da assinatura. Uma conta continua com sua página atual, limites técnicos existentes de 100 grupos/500 itens e histórico de 50 versões/180 dias.
- A marca da plataforma permanece em todos os planos. O pedido explícito posterior de marca sempre presente supera a proposta antiga de remoção no Pro. Não vender remoção de marca.
- Assinatura de página é outro produto: entidades, checkout, webhook e capacidades próprios; Order/Promotion e destaque continuam intactos. Alternativa: simular renovação com PaymentIntent; descartada por misturar estados e não representar recorrência.
- Usar Stripe Billing/Checkout em modo subscription e webhook assinado obrigatório. A skill stripe:stripe-best-practices e a referência billing foram consultadas. Context7 consultou a documentação oficial de Checkout/Billing; exemplos atuais não são assumidos compatíveis com SDK antigo sem conferir tipos. SDK existente 18.5.0 usa API 2025-08-27.basil; npm informa 23.0.0 como versão atual.
- Isolar o SDK atual de Billing com alias de pacote, mantendo o SDK avulso existente. Alternativa: atualizar globalmente o Stripe de 18 para 23; descartada nesta feature para não trocar a versão da API usada pelos destaques em produção. Custo: uma dependência adicional explícita, limitada ao adapter novo; unificação fica para uma migração específica com prova dos contratos antigos. Isso não é uma biblioteca visual.
- Preços pagos não serão inventados. Planos em BRL, centavos inteiros e periodicidade mensal; preço efetivo vem de Price recorrente validado no provedor e de uma versão imutável do plano. Vendas desabilitadas por padrão. Alternativas: fixar valores sem custo validado, converter o destaque em assinatura ou cobrar antes de existir o recurso; descartadas. O administrador poderá configurar preços reais; ausência de configuração não impede desenvolver/testar o ciclo com fixtures locais.
- Cancelar e mudar plano no fim do período; sem trial ou prorrata automática nesta entrega. Benefícios pagos não ultrapassam a cobertura confirmada do período. Sem concessão pelo retorno do navegador. Alternativas: cancelamento instantâneo com perda de saldo ou upgrade imediato com cobrança proporcional; descartadas para reduzir surpresa e ambiguidade. Conteúdo não é apagado no downgrade/expiração.
- Capacidade disponível e capacidade comercial são conceitos distintos. A proposta Pro inclui analytics/agendamento e Premium inclui blocos/subdomínio, que pertencem a features seguintes. O catálogo explicita recursos futuros e não habilita venda quando não há capacidades diferenciadas entregues. Não criar botões de ações inexistentes nem chamar essas features de prontas para justificar uma assinatura.
- Endereço de retorno deve ser caminho interno validado; URL de Checkout deve vir de host permitido do provedor. Nenhuma chave, papel visual, cookie de função, ID de preço enviado pelo navegador ou metadata arbitrária concede acesso. Assinaturas ligam Customer/Subscription/Session reais a tenant/owner no banco.
- Não presumir configuração fiscal por existir chave Stripe. Não ligar automatic_tax sem registro ativo comprovado; a habilitação comercial precisa de configuração fiscal explícita, além de preço, provedor e capacidades prontos. A escolha técnica não é uma validação tributária nem um lançamento comercial.

## Reuso e fronteiras verificadas

O gateway existente trata Pix/cartão avulso e refunds de Order; não contém ciclo recorrente. Foram reutilizados os padrões de idempotência, autenticação, tenancy, erros e controles, sem herdar OrderStatus. Profile/ProfileRevision continuam responsáveis por autoria e publicação; assinatura não publica, restaura, modera ou altera suas versões. A API de planos retorna capacidades verificadas pelo servidor, sem preços duplicados na UI.

## Plano de validação

S1 domínio: pendente não concede capacidade, cobertura expirada não concede, downgrade não elimina conteúdo, valores em centavos e limites de checkout seguros. S2/S3: FKs compostas, versões imutáveis, sessão/cliente/assinatura correlacionados, eventos deduplicados, reconciliação canônica resistente a entrega fora de ordem, falhas sem falso sucesso. S4/S6: comparação de planos, configuração ausente, checkout pendente, retorno sem ativação, confirmação assinada, cancelamento/alteração e isolamento em desktop/mobile, com estados e skeletons locais. S5: PostgreSQL e assinatura real do webhook com provedor local. S7: checks locais e registros; nenhuma publicação implícita.

Documentação oficial consultada: [Checkout com assinaturas](https://docs.stripe.com/payments/checkout/build-subscriptions), [webhooks de assinaturas](https://docs.stripe.com/billing/subscriptions/webhooks). As decisões acima serão reconciliadas com implementação e provas; não são evidência de feature pronta.

## S1 e inspeção técnica iniciados

Nove testes de domínio executados em RED/GREEN: cobertura confirmada ativa, estados pendentes/inadimplentes, expiração, capacidades realmente disponíveis, preservação do gratuito, centavos inteiros, versões coerentes e URLs de retorno/Checkout. Evidências `output/roadmap-f11/unit-red.log` e `unit-green.log`. O valor de 1290 centavos existe somente como fixture; não é decisão de preço público.

SDK `stripe-billing@npm:stripe@23.0.0` instalado com npm e lockfile: uma dependência nova, API efetiva `2026-09-30.endive` conferida no pacote. O SDK antigo avulso continua 18.5.0/API basil. Tipos atuais têm período em SubscriptionItem e referências de Invoice via parent.subscription_details; não copiar exemplos antigos sem adaptar essas projeções. Nenhuma chamada ao Stripe ou criação de recurso externo foi feita.

A porta `domain/billing/billing-gateway` separa Price, Customer, Checkout, snapshot canônico da assinatura, mudança/cancelamento e verificação de eventos. Checkout/cancelamento/troca têm intenção durável antes da chamada externa e chave idempotente estável. Webhook guarda referências minimizadas, não o JSON com dados pessoais, e reconcilia o objeto atual do provedor. A sequência final é por assinatura, sob lock da conta: uma assinatura histórica não pode invalidar a leitura da assinatura atual. Integração e HTTP possuem provas em PostgreSQL; ver o registro corrente abaixo.

## S2 em elaboração — persistência

Schema validado e Prisma gerado. Migração aditiva `20261018010000_profile_billing` aplicada em PostgreSQL descartável: planos/versões, configuração comercial, conta, assinatura, capacidades, operações duráveis e eventos minimizados. FKs compostas prendem tenant/owner; índice parcial impede duas assinaturas não encerradas por conta. Versões comerciais são imutáveis; novas edições não reescrevem contratos antigos. Operações próprias recuperam crash entre persistência e chamadas externas, sem colocar cobranças na fila de WhatsApp nem reaproveitar Order. Não aplicada em produção nem no desenvolvimento compartilhado enquanto a regressão está em execução.

Não há backfill de assinaturas pagas nem criação de recursos no Stripe. O gratuito existente permanece a projeção padrão, inclusive para tenants novos sem configuração comercial. A lista de capacidades entregues contém apenas a base atual; analytics, agendamento, blocos e subdomínio só entram após sua feature possuir autorização no servidor e critérios validados.

## Registro corrente — implementação local, regressão em execução

Backend: catálogo, conta, checkout durável, cancelamento, troca no próximo ciclo, reconciliação, webhook com MAC verificado pelo SDK, administração e retentativa auditada. Worker próprio no processo existente, sem ocupar o consumidor BullMQ dos pagamentos avulsos; lease de 180 s, até dez tentativas com espera progressiva, lote limitado e proteção contra sobreposição. Operações são atendidas antes do exame de dois checkouts expirados por ciclo. O SDK não repete requisições internamente: a recuperação durável controla as tentativas e reutiliza a mesma chave. Alternativa: duas camadas de retry e lotes externos longos; descartada por atrasar cancelamentos em falha do provedor.

Frontend: `/painel/assinatura` e `/admin/assinaturas`; catálogo comparável, confirmação explícita de recorrência/troca/cancelamento, período e cobertura confirmados, retorno pendente, retomada de checkout, conferência e falhas. Administração lista antes de abrir formulários em modal; preço e recursos têm duas etapas. Reutiliza Button, Field, Select, FormSteps, OverlayDialog, Badge, EmptyState, ErrorState, WorkspaceActions e SkeletonRegion, com CSS Modules. Navegação e títulos seguem o painel; ícones distintos para assinatura pessoal e gestão de assinaturas. Nenhuma dependência visual adicionada.

### Refinamentos e alternativas D12/D13

| Assunto | Escolha implementada | Alternativas consideradas |
| --- | --- | --- |
| Janela de checkout | Intenção/sessão de 60 minutos; URL só exposta depois de persistir correlação e resultado. Origem de retorno congelada na operação. | Sessão sem validade local ou retorno livre; criaria compras abandonadas e redirecionamento inseguro. |
| Cancelamento sem saldo pago | Expira sessão aberta após confirmação externa ou cancela assinatura ainda não paga sem faturar/prorratear. Cancelamento manual fica `CANCELED`; vencimento natural comprovado fica `EXPIRED`. | Aplicar cancelamento no fim de um ciclo ainda não pago; manteria risco de renovação sem benefício confirmado. |
| Cancelamento com saldo | Cancela renovação; cobertura confirmada continua até seu limite. Não promete estorno automático. | Retirar saldo imediatamente ou inventar política de reembolso. |
| Suspensão | Bloqueia compra e enfileira cancelamento durável/expiração; falha aparece para recuperação administrativa. | Confiar somente no bloqueio da interface, deixando cobrança futura continuar. |
| Troca | Ciclo ativo e pago, mais de cinco minutos antes do fim; servidor informa `canChange`, valida versão e fronteira novamente; Schedule sem prorrata, novo benefício só depois de Price/cobertura canônicos. | Upgrade instantâneo proporcional, troca silenciosa de Price ou concessão pelo retorno. |
| Oferta retirada antes do checkout | Revalida a oferta antes de criar sessão; encerra intenção sem cobrança se preço/recursos/liberação mudaram. | Cobrar uma proposta desabilitada depois da solicitação. Contratos já confirmados preservam sua edição. |
| Price desconhecido | Atual desconhecido exige conferência e não concede benefício pago; próximo Price desconhecido exige revisão e preserva o período atual comprovado. | Conceder com base em metadata ou retirar saldo atual por desconhecer só o próximo plano. |
| Vendas desligadas | Impede novas compras; cancelamentos, eventos e reconciliação continuam com o provedor configurado. | Desativar também o ciclo das assinaturas existentes. |
| Falha esgotada | Admin pode repetir cancelamento ou leitura canônica com identidade estável e auditoria; não há replay administrativo de compra. | Repetir cobranças arbitrariamente ou mostrar sucesso sem confirmação. |

### Provas já executadas e validação restante

Primeira bateria: 489 unitários backend e 269 frontend aprovados; após novos casos, contagens finais ficam no fechamento. Dez testes de domínio e sete contratos do SDK real com servidor HTTP local aprovados. PostgreSQL: 16 cenários iniciais aprovados; cenário adicional de recuperação administrativa e regressão ampla em execução. Playwright específico: **6/6** aprovados, sem retry/skip, com BFF/API/banco/worker reais e simulador externo conectado pelo SDK real. Inclui retorno sem ativação, confirmação assinada, troca no próximo ciclo, saldo após cancelamento, fiscal pendente, edição imutável, controle de acesso, falha/recuperação, teclado, Axe, refresh sem mudança de altura e 320 px/200%.

O primeiro E2E teve quatro aprovados e duas asserções erradas: cancelamento manual esperava `EXPIRED`, mas a operação confirma `CANCELED`. Corrigido o oráculo e repetida a suíte completa; regra da aplicação preservada. O contrato DELETE do SDK serializa opções na query, verificado pelo teste A07; não presumir corpo em todos os métodos. O primeiro PG reutilizou intenções de testes anteriores: fixtures agora removem somente suas próprias linhas de cobrança após cada caso; banco descartável recriado e execução repetida. Não se alterou o claim de produção para esconder interferência de testes.

Os preços e capacidades diferenciadas usados no E2E são fixtures, não ofertas públicas ou prova de funcionalidades futuras entregues. A entrada E2E compõe explicitamente o SDK com host local e capacidades de teste; o código de produção continua com lista base e venda desligada. Nenhuma rota de produção pode ativar o simulador. A suíte padrão também inclui F11, sem depender de flag esquecida no CI.

S7 permanece separado: CI remoto, habilitação comercial, conta/produtos/fiscal reais e release não foram executados. Novas decisões são documentadas sem perguntas rotineiras, conforme autorização; nenhuma ação de Git/deploy implícita.

Reconciliação automática acrescentada após revisão do ciclo: a cada cinco minutos, assinaturas abertas sem evento recente são consultadas em lotes duráveis de até 20 referências, por meio do mesmo caminho canônico. Não depende de abrir o painel nem cria cobrança. Alternativas: confiar exclusivamente na entrega do webhook ou exigir ação manual; descartadas porque uma confirmação perdida pode deixar um período efetivamente pago sem acesso. PG14 simula webhook ausente, confirma deduplicação e recuperação da cobertura. Índices aditivos em status/atualização e assinatura/tipo/data atendem esse percurso; a migração adicional não reescreve a primeira.

Checks atuais: backend **490/112 arquivos**, frontend **272/81 arquivos**, PostgreSQL de regressão **209/21 arquivos** e bateria específica atualizada **18/3 arquivos**, incluindo PG14/H04. Os totais se sobrepõem; não somá-los como casos únicos. Lint/tipos/build backend aprovados; lint/tipos frontend aprovados; build Next do harness aprovado. Regressão ampliada de navegador em execução; não tratar a captura gerada como inspeção concluída de todas as áreas.

### Exclusão da conta — integração com o comportamento existente

A revisão encontrou que a anonimização atual apaga identificadores/página, troca senha e nome, mas preserva `User.status=ACTIVE`; a política de banimento após exclusão permanece pendente no módulo de autenticação. Não foi alterada. O worker de assinaturas agora considera também a ausência durável de identificadores para parar renovação/expirar sessão, e a projeção/canonicalização não concede capacidade paga à conta sem identificadores. Trocar e-mail e aguardar nova confirmação preserva o período já pago; novas compras/trocas continuam sujeitas a canSubmit. PG16 teve RED/GREEN real dessa distinção. A correlação de checkout revalida elegibilidade depois da resposta externa: não devolve URL a uma conta excluída durante a chamada.

Alternativas descartadas: transformar exclusão em banimento (mudaria regra comercial/de conta), manter cobrança por olhar só o status, ou manter uma cópia de e-mail/telefone para decidir. PG15 usa a anonimização real, verifica contatos removidos, status preservado, cancelamento de renovação e ausência de reativação por webhook tardio. E05 acrescentado à jornada de navegador existente. Registros financeiros permanecem minimizados, sem expurgo automático nesta entrega, acompanhando a preservação observada dos pedidos; a política final de retenção/liberação financeira pertence ao gate S7 e não herda os 180 dias de analytics.

### Contratos concretizados

| Operação | Resultado |
| --- | --- |
| `GET /api/v1/profile-plans` | Catálogo público sem credenciais/preços inventados; `available` e capacidades calculados no servidor; no-store. |
| `GET /api/v1/me/subscription` | Situação privada, cobertura, próxima edição, `canChange`, retomada e operações pendentes; sem IDs de Customer/Subscription externos. |
| `POST /api/v1/subscriptions/checkout` | `planVersionId`, retorno interno permitido e Idempotency-Key UUID; 202 com operationId, sem concessão de acesso. |
| `POST /api/v1/me/subscription/cancel` ou `change` | expectedVersion; na troca, targetPlanVersionId e timing PERIOD_END. 202 durável; SDK confirma efeitos. |
| `GET /api/v1/me/billing-operations/:id` | Somente dono/tenant; URL de pagamento validada apenas depois de persistir a sessão. |
| `POST /api/v1/me/subscription/reconcile` | Solicita conferência canônica sem criar cobrança; deduplicada. |
| `POST /api/v1/billing/stripe/webhook` | Bytes originais, Stripe-Signature obrigatória, ambiente e Customer persistido; confirmação é processada pelo worker, sem confiar em metadata do navegador. |
| `/api/v1/admin/profile-billing` | GET de configuração/pendências, PUT settings, POST plans e retry de cancelamentos/eventos com ADMIN real no banco. |

Leituras não criam entidades. Mutações via cookie mantêm CSRF existente; webhook sem cookie depende de MAC real. Outros donos/tenants não recebem dados por possuir IDs. Dados de saída/erros são minimizados, `no-store`; logs guardam códigos sanitizados, não mensagens cruas do provedor.

### Migração e ensaio de reversão

As duas migrações foram aplicadas em banco descartável e no desenvolvimento confirmado `localhost:5437`. A comparação SHA-256 dos registros anteriores confirmou **25 pedidos, 38 destaques e uma página integralmente preservados** (`development-preservation.json`); só as duas migrações F11 estavam pendentes. Não houve backfill pago ou recurso externo. Planos de consulta com `EXPLAIN (ANALYZE, BUFFERS)` em fixture pequena constam em `query-plans.log`; não são benchmark de produção.

PG10 desativa vendas/configuração fiscal após ativar uma assinatura, comprova que o saldo pago continua consultável e que cancelamento continua processando. Para reverter a entrada nova, manter `PROFILE_BILLING_SALES_ENABLED=0` e desabilitar oferta nas configurações; manter credencial/webhook/worker para cumprir contratos já existentes. Não resetar banco nem apagar registros financeiros, e não voltar a um worker sem suporte ao ciclo se existirem contratos. Nenhuma configuração Coolify, cobrança real, commit, push ou deploy foi executada.

## Fechamento local S0–S6

| Gate | Resultado aceito |
| --- | --- |
| Domínio/SDK | Dez cenários de domínio e sete contratos com SDK real; assinatura verificada nos bytes originais. |
| Unitários completos | Backend **490/112 arquivos**; frontend **276/82 arquivos**, incluindo quatro testes iniciais da F13 que já estava em preparação. Os componentes F11 têm oito cenários próprios. |
| Integração completa | **212/21 arquivos** em banco descartável novo; F11 tem **20 casos em três arquivos**, incluindo exclusão, identificação, rollback de vendas e webhook ausente. |
| Navegador | **69/69** regressão ampla; **10/10** específicos F11, desktop/mobile, sem retry/skip. São relatórios distintos com sobreposição. |
| Visual | Dezesseis capturas inspecionadas em [evidências F11](../frontend-profissional/evidencias/f11-2026-10-17). Duas execuções adicionais de quatro cenários corrigiram somente a captura de viewport/scroll, sem alterar tolerância, ocultar elementos ou retocar pixels. |
| Fonte/validação | `source-manifest.json`: **59 arquivos F11 idênticos à cópia validada**, mais as duas definições de ícones F11; nenhum desvio. Adições em preparação da F13 ficam fora desse escopo. |
| Checks | Lint, typecheck e build dos dois pacotes aprovados; Next compilado pelo harness isolado. Prisma validate/generate e migrações aprovados. |

AC01/T01: PG01/H01 e E01 preservam gratuito sem provedor. AC02/T02: domínio, PG07/09/11/14/16 e E01/E04 comprovam capacidades pelo estado/cobertura canônicos; recursos futuros não são vendidos. AC03/T03: PG03 compara os registros anteriores de Order/Promotion integralmente; E01 preserva a página e a regressão executa F01/F42. AC04/T04: D12/D13, PG05/10, H02/H04 e E02/E03/E05 comprovam liberação, preços/versões, falhas, cancelamento e recuperação, sem decisão por papel visual.

Uma regressão intermediária sobre banco reutilizado falhou em F07-W01 (`Recurso não encontrado`); o relatório foi mantido em `postgres-regression-final.log`. A execução aceita recriou **somente** o banco descartável desta tarefa e passou os 212 cenários, sem mudar esse teste ou seus timeouts. Prisma generate encontrou uma vez o DLL Windows em uso pelo E2E; repetido após o encerramento do harness, passou sem encerrar processo do usuário. Esses diagnósticos não são contados como execuções aprovadas.

Reproduzir: backend `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; PG com PG_SPECS=1 e URLs locais descartáveis: `npm run test:pg`. Frontend `npm run lint`, `npm run typecheck`, `npm test`; build feito por `next build` na cópia. Playwright específico: `playwright test --config playwright.billing.config.ts`; regressão: arquivos F11/F19/F08/F01/F42/workspace/loading nos projetos features/features-mobile. Namespace `roadmap-f11`, offset 200, sem usar as portas do desenvolvimento. Logs/reportes ficam em `output/roadmap-f11` ignorado; documentação/capturas rastreáveis ficam em docs.

S7 ainda exige CI remoto, revisão operacional/comercial/fiscal real e autorização para qualquer liberação. A aplicação local tem as rotas novas, migrações de desenvolvimento aplicadas e vendas desligadas por padrão. A continuidade do roadmap avança para F13; não encerrar após esta feature. Sem branch nova, commit, push ou deploy.

## Evolução posterior F14

O inventário de capacidades do fechamento F11 acima é histórico. A F14 acrescentou profile.scheduling à registry após autorização/projeção de servidor e provas locais; analytics/blocos/subdomínio seguem futuros. A política efetiva foi reutilizada por leitura compartilhada, preservando os gates de venda e o gratuito. Ver [execução F14](execucao-f14.md).
