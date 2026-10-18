# Modo de suporte administrativo

Implementação local de 18/10/2026. Entrada em Administração → Contas → **Detalhes / suporte**. Abre o painel real do titular com navegação completa; uma faixa abaixo do cabeçalho identifica o modo, o nome e a condição de somente leitura. A saída retorna à aba Contas, à busca aplicada, à rolagem e ao foco no card original. A troca usa navegação completa para descartar caches de módulos da identidade anterior.

## Segurança e ciclo de vida

- `POST /api/v1/admin/users/:id/support`: exige access token, refresh da mesma sessão, CSRF e admin ACTIVE confirmado no banco. O alvo deve ser USER do mesmo tenant; suspensão e verificação do alvo continuam determinando o que ele vê.
- O access token recebe `sid`, vinculado ao `jti` do refresh. Sessões antigas são atualizadas pelo fluxo normal de refresh antes de entrar no suporte.
- Uma capacidade opaca de 256 bits fica em cookie HttpOnly, SameSite=Strict e Secure em produção. Redis guarda o contexto por 15 minutos e uma vinculação à sessão original até o vencimento do refresh. A vinculação permanece após os 15 minutos para exigir saída explícita, em vez de restaurar privilégios silenciosamente.
- O hook global consulta essa vinculação também sem o cookie de suporte. Remover o marcador ou enviar somente o access token original não libera escritas. Criação e revogação usam Lua atômico no Redis; a saída remove ambos os registros.
- Cada GET revalida a sessão original, revogação, admin ativo, tenant e alvo. Credenciais originais são removidas da requisição antes de executar o handler; `readAccessUser` resolve apenas o titular observado.
- Todos os verbos diferentes de GET são recusados, incluindo HEAD/OPTIONS. A única exceção é `POST /support/exit`, que encerra o contexto e exige CSRF. A exceção de Bearer do CSRF normal não se aplica aos controles de suporte.
- GETs administrativos, códigos de confirmação, saídas rastreadas e o GET de início de aquisição são bloqueados. O transporte do cliente bloqueia as mutações internas de analytics durante o suporte.
- GETs executam através do Prisma compartilhado em um pool separado com `default_transaction_read_only=on`, limitado a duas conexões. O PostgreSQL recusa escritas de ORM, SQL e transações. AsyncLocalStorage isola esse contexto das requisições normais concorrentes.
- Respostas JSON removem capacidades de pagamento (`checkoutUrl`, `resumeCheckoutUrl`, `portalUrl`, `clientSecret`) e tokens de acesso/refresh. Assim um checkout já existente não oferece um caminho de alteração fora da API.
- Entrada e saída explícita geram auditoria com admin, alvo, tenant e request ID. Requisições de leitura registram os IDs do operador e do alvo, sem seus nomes/e-mails. O cookie de suporte entra na lista de segredos excluídos dos logs.
- Redis indisponível impede confirmar a ausência de um modo ativo: requisições administrativas com identificação de sessão falham de forma fechada. Não existe fallback que permita escrever nessa situação.

O cookie é compartilhado entre abas do mesmo navegador. A restrição pertence à sessão do admin; uma sessão independente de outro navegador continua independente. Este modo não tenta remover a autoridade administrativa fora daquela sessão. A segurança não depende do papel exibido no cookie `catalogo_role` nem do sessionStorage.

## Evolução e limites

Novas rotas herdam o hook HTTP e os repositórios herdam o contexto de leitura do Prisma, sem cadastrar uma permissão por página. Rotas devem continuar usando `readAccessUser`/`verifyJWT` e o cliente Prisma compartilhado. Código que introduza um novo transporte externo, outro cliente de banco ou uma capacidade de alteração em resposta GET precisa da revisão normal de segurança. O pool é uma proteção contra escrita acidental; não é um sandbox para código de servidor deliberadamente malicioso.

O backend de produção, proxies de conexão e aparelhos físicos não foram validados nesta etapa. Não houve deploy, migração, instalação de dependências, commit ou alteração de condições comerciais. O pool usa as credenciais já configuradas e opções documentadas do PostgreSQL; sua conexão foi comprovada no PostgreSQL 16 descartável.

## Composição e fontes

`features/support` contém entrada, faixa e CSS Module. `SiteShell` mantém a faixa nas navegações e na prévia sem cabeçalho. A saída comum de conta é ocultada neste modo para haver uma única ação de encerramento. `lib/api` evita tentativas de mutação e refresh no cliente, como conveniência; o servidor continua sendo a barreira de segurança.

Referências consultadas: [admin/impersonação do GitLab](https://docs.gitlab.com/administration/admin_area/) fundamenta entrada por usuário e saída explícita; [visibilidade de estado da NN/g](https://www.nngroup.com/articles/visibility-system-status/) fundamenta identificação persistente e discreta. Refero não estava disponível nesta sessão. Não foram importados layouts ou identidade externa. A faixa foi examinada em capturas reais, e sua composição foi corrigida para não comprimir texto com zoom.

A configuração de conexão segue a [documentação Prisma ORM v6](https://docs.prisma.io/docs/orm/v6/overview/databases/postgresql) e o [PostgreSQL 16](https://www.postgresql.org/docs/16/runtime-config-client.html). O projeto continua com Next 15/React 19.

## Validação

| Verificação executada | Resultado |
| --- | --- |
| Backend: lint, typecheck, build | Passaram |
| Backend: `npm test` | 121 arquivos, 520 testes passaram |
| Frontend: lint, typecheck, build | Passaram; avisos preexistentes de CSS, raiz de workspace e plugin ESLint do Next |
| Frontend: `npm test` | 94 arquivos, 311 testes passaram |
| `playwright.support.config.ts` | Quatro testes: jornada desktop, jornada mobile e prova PostgreSQL em ambos os projetos |
| Escrita HTTP direta, refresh, exclusão de cookie e replay | Recusados; marcador restaurado pelo servidor após remoção |
| Leituras reais | Sessão USER, links, perfil, assinatura, favoritos, coleções, convites, preferências e pedidos |
| Teclado e retorno | Entrada e saída por Enter; foco no card e rolagem original restaurados |
| Acessibilidade automatizada | Axe sem violações na faixa; não constitui certificação de toda a aplicação |
| Visual | Chromium 1440×900 e 390×844, mais 320 px com fonte a 200%; capturas examinadas |

Ambiente E2E isolado: `E2E_RUN_ID=support-20261018`, `E2E_PORT_OFFSET=1400`. O setup/teardown cria e remove somente os containers desse identificador. As instâncias que já estavam nas portas padrão foram preservadas.

Comandos: em cada pacote, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Para a jornada: no frontend, definir as duas variáveis acima e executar `npx playwright test --config playwright.support.config.ts`. A prova `backend/src/lib/support-read-context.pg.spec.ts` é disparada pela jornada contra o banco descartável com `ANALYTICS_DATABASE_URL`, nunca contra produção.

Capturas: [desktop](evidencias/modo-suporte-2026-10-18/desktop.png), [mobile](evidencias/modo-suporte-2026-10-18/mobile.png) e [zoom](evidencias/modo-suporte-2026-10-18/mobile-zoom.png).

## Arquivos e reversão

Backend: `http/support-mode.ts`, `lib/support-read-context.ts`, integração em `app.ts`, `verify-jwt.ts`, sessão de auth, tipo JWT, logger e seleção do cliente em `repositories/tenants-repository.ts`. Frontend: `features/support`, composição em layout/SiteShell/SiteNavigation, entrada e retorno em `admin/visao/office.tsx`, invalidação de sessão e proteção de transporte em `lib/api.ts`. Os testes novos ficam junto das fronteiras e em `e2e/support-mode.spec.ts`, com configuração própria.

Para reverter, remover somente esses arquivos novos e os trechos de integração desta funcionalidade, preservando as demais mudanças locais. Não usar reset/revert dos arquivos inteiros, pois `app.ts`, `office.tsx`, navegação e outros já continham alterações anteriores. Não há migração de banco a reverter. Revogar sessões de suporte em uso pela saída antes de retirar os hooks do servidor; os registros Redis expiram, mas não devem ser tratados como permissão após remover o recurso.
