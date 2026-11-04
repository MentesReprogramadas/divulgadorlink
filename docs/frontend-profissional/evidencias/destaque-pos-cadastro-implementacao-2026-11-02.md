# Implementação do funil de destaque — 02/11/2026

Branch: `codex/destaque-pos-cadastro`, criada de `origin/main` em `0f9f0a7a`.
Worktree: `C:/VSCODE/divulgadorlinks/.worktrees/destaque-pos-cadastro`.
Nenhum commit, push, merge ou deploy. Workspace original preservado.

## Resultado

- Botão “Destacar este link” com megafone, faixa própria, explicação e altura mínima de 52 px. CSSglobal passou a limitar apenas ações compactas, sem vazar para a nova ação.
- Cadastro concluído abre oferta opcional de 20%, com preço original, preço com desconto e economia; sem redirecionamento automático. A restrição visual “aguarde revisão para comprar” foi removida.
- A política existente de aprovação automática em limiar 0 é aplicada sem esperar ciclo da fila na jornada comercial. A confirmação de pagamento ativa as superfícies contratadas. Outras proteções de conta, sessão, URL/conteúdo, dono, tenant e idade continuam no servidor.
- Upgrade Home por label inteiro clicável, checkbox nativo/Espaço e foco visível, imediatamente acima de Continuar/Pagar no resumo desktop e no fluxo mobile. O incremento e o total são derivados dos preços do servidor.
- Campanha inicia por 7 dias; todas as opções existentes continuam em “Ver outros espaços de destaque”. Checkout comum/renovação preservam os padrões anteriores.
- Uma oferta por conta/tenant vinculada ao link recém-cadastrado;20% sobre snapshot do catálogo, validade de 24 h e intervalo de 30 dias para nova oferta de outro link. Preço e prazo não reiniciam ao fechar/reabrir.
- Uma retenção de Busca + Nicho pelo mesmo desconto, com Home opcional, seguida do lembrete recuperável. Fechar lembrete persiste; expirar ou pagar o remove.
- Reserva transacional evita uso concorrente do desconto. Pedido criado no prazo preserva seus termos; vencimento/estorno/replay seguem contrato existente.
- Retomada autenticada de Pix/cartão existentes por POST/orders/:id/resume, sem segunda cobrança. Segredo de cartão restrito a checkout/resume; legado recupera PaymentIntent original validando identificador/valor/moeda.
- Plano/duração não mudam enquanto existe cobrança pendente; resumo mostra os termos originais. Compra/Purchase aguarda confirmação do servidor.

## Fontes e verificações

Ver [E2E detalhado](destaque-pos-cadastro-e2e-2026-11-02.md), [spec](../../superpowers/specs/2026-11-02-destaque-pos-cadastro.md) e [plano](../../superpowers/plans/2026-11-02-destaque-pos-cadastro.md).
Os protótipos foram ponto de partida; as capturas entregues nesta etapa são do aplicativo real compilado em localhost, com API/banco reais de teste e gateway stub. Nenhuma API do aplicativo foi mockada no E2E.

| Verificação | Resultado |
|---|---|
| Frontend lint | Passou |
| Frontend typecheck, incluindo E2E | Passou |
| Frontend build normal | Passou;79 páginas estáticas; servidor de inspeção usa.next-e2e separado |
| Frontend suíte ampla excluindo arquivo de baseline abaixo | 242 arquivos / 1006 testes passaram na execução registrada |
| Checkout final após revisão | 13 testes passaram |
| Cadastro/convite/lembrete/prazo | 27 testes passaram nas execuções afetadas |
| Backend lint/typecheck/build | Passaram |
| Política/checkout | 14 testes passaram |
| Checkout HTTP | 9 testes passaram |
| Retomada HTTP/Stripe | 4 testes passaram |
| Permissões | 5 testes passaram |
| Campanha PostgreSQL após migrações | 7 testes passaram; corrida, snapshot, cooldown, isolamento, ativação e pagamento tardio |
| E2E final | 8/8 passaram, 4 jornadas em desktop 1440×900 e mobile 390×844 |
| Acessibilidade automatizada | Axe no resumo sem violações nos dois viewports; não é auditoria de todo o site |
| Interação | Texto/fundo do card, checkbox e Espaço; posição antes do CTA;52px;320px; fonte200% |
| Revisão independente | P1retomada cartão/P2resumo de pedido pendente corrigidos; reavaliação sem impedimento importante |
| diff whitespace | git diff --check passou |

### Falhas fora da alteração reproduzidas em main limpa

Frontend: suíte completa inicial teve2 falhas em `features/affiliates/day-planner.test.tsx`. O mesmo arquivo na main limpa exportada via gitarchive teve14passados/2 falhas, mesmasasserções. Código e teste de Afiliados não foram alterados. Evidência: `output/frontend-baseline-check/frontend/output/frontend-baseline-check/result.json`.

Backend: suíte completa registrou1022passados/26 falhas em 4 arquivos. A main limpa reproduziu as mesmas26 falhas: catálogo23+revogação1 por Redis6380ausente;2provas Pix por PostgreSQL5433ausente, na criação da fixture. Com Redis isolado6580/15,24 testes de catálogo/revogação passaram tanto na main limpa quanto na branch. Evidência: `output/backend-baseline-check/`.
Não afirmar suíte global inteira verde. Não foram alterados serviços alheios nem testes de Afiliados para esconder essas falhas.

## Inspeção manual e ambiente entregue

Site real: http://tenant-a.localhost:3200
Conta demonstrativa local: `launch-preview@tenant-a.test`; senha `Senha-e2e-1`.
Depois dos testes (que restauram seu limiar), o tenant de demonstração foi configurado em 0 por pedido do usuário. Inspeção manual via PlaywrightMCP fez login e cadastrou “Comunidade de jogos” pela UI real:201,oferta20%visível,semoverflowhorizontal. Contexto MCP teve todas as rotas simuladas removidas antes da inspeção real.

Serviços exclusivos: Next3200/API3533/stub4299/PostgreSQL5633/Redis6580.
Containers: `divulgador-e2e-pg-destaque-funil` e `divulgador-e2e-redis-destaque-funil`.
Harness próprio PID11528; detalhes do processo em `frontend/e2e/serve.pid`. Permaneceram rodando para revisão local.
Não conectar esse ambiente a cobranças, mensagens ou bancos de produção.

## Capturas reais finais

Arquivos em `output/promotion-launch-offer-validation/{desktop,mobile}`:

1. `01-oferta-pos-cadastro.png`
2. `02-checkout-home-selecionada.png`
3. `03-resumo-pagamento.png`
4. `04-pix-real-gateway-teste.png`
5. `05-pagamento-confirmado.png`
6. `06-meus-links.png`
7. `07-retencao-mesmo-desconto.png`
8. `08-resgatar-oferta.png`
9. `09-expirada-320.png`
10. `10-expirada-zoom-200.png`

Capturas visualmente inspecionadas. Diálogos capturados na viewport; demais capturas após scrolltop+rAF, sem máscaras e preservando foco. Isso evita artefato Chromium fullpage de skiplink fixo fora da viewport, sem alterar o produto para esconder o link de acessibilidade.

## Arquivos e implantação futura

Backend: domínio/usecase de launch-offer, controllers de ofertas/pagamento, checkout-store/prisma, adapterStripe, permissões, schema e testes.
Frontend: cadastro, Meuslinks, AreaFrame, checkout, componentes launch-offer/home-upgrade e CSSModules, regressõesVitest/E2E e configuraçãoCI.
Migrações aditivas:
- `20261102170000_promotion_launch_offer`
- `20261102173000_resume_card_checkout`

Aplicadas somente no banco descartável. PrismaClient regenerado após encerrar exclusivamente processos próprios durante o rebuild. Deploy futuro exige aplicar migrações e publicar backend/frontend juntos; não foi feito.
Grafo não foi apresentado como atualizado depois da implementação; precisa de atualização incremental antes de nova análise de impacto que dependa dele.

## Limites e reversão

- Cartão real/3DS e aparelho físico não exercitados; retomada verificada em componentes/backend e Pix em fluxo completo com gateway de teste.
- Sem comprovação de aumento de conversão e sem validação em produção.
- npmci preservou manifests/lockfiles; relatou vulnerabilidades pré-existentes (frontend 15 moderadas; backend 1 baixa / 29 moderadas). Sem auditfix.
- Alterações locais isoladas na branch. Para abandonar a implementação, não mesclar a branch e encerrar somente o harness/container desta execução. Não reverter o workspace original nem remover dados comerciais por rollback.


## Revisão posterior
A matriz de complementos, o bloqueio +18 em renovação/replay e a retenção em Busca + Nicho foram atualizados. As evidências atuais estão em [revisão dos complementos](destaque-complementos-2026-11-02.md).
