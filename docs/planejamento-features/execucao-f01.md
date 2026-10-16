# F01 — resultado do destaque

Execução autorizada em 15/10/2026 na branch `codex/roadmap-features`, base `55b115b`. Não representa implantação em produção. Decisões D01/D02 em [execução contínua](execucao-roadmap.md).

## Contratos implementados e reuso

- API: `GET /api/v1/analytics/links/:linkId/performance`, datas inclusivas ISO, comparação anterior equivalente e filtro opcional de promoção. Até 366 dias, sem datas futuras. Fuso São Paulo e retenção existente de 12 meses.
- Autorização: proprietário ACTIVE ou ADMIN atual consultado no banco; outro dono 404, tenant incompatível 403, sem sessão 401. Resposta privada sem cache; nenhuma escrita ao consultar.
- `PrismaAnalyticsRepository` agrega os eventos originais e usa EXISTS para janelas de promoção. CTR usa totais, sem somar taxas. CPC usa cliques observados durante destaque, sem alegar causalidade, entrada ou venda.
- `PromotionInvestment` vincula pedido pago/superfície/promoção. Ativação, renovação, liberação de reserva e ledger compartilham transação. Locks no pedido e link, unicidade por pedido/superfície, FKs compostas com tenant e checks de valor/intervalo. Não inferir histórico sem vínculo.
- Consulta apresenta cobertura completa/parcial/indisponível, ausência de eventos e zero cliques como situações diferentes. Custo desconhecido e CPC sem cobertura/cliques são nulos.
- Frontend em `features/promotions`: contrato, composição de apresentação e container com transporte separado. Rota Server Component em `/painel/links/[id]/resultado`; sessão/estrutura pelo layout atual, acesso em “Ver resultado”. Reuso de Field/Input/Select/Button, formatRate, formatCents e tokens. Sem dependências novas.

## Evidência de testes e falhas preservadas

Ambiente: Windows, Node 24.21.0/npm 12.1.0; PostgreSQL pgvector16 e Redis7 locais descartáveis. API e worker reais no E2E, provedores externos sintéticos. CI usa Node22 e deverá confirmar compatibilidade.

| Evidência | Resultado observado |
| --- | --- |
| `f01-unit-red.log` | Domínio antes da implementação: 5 falhas de comportamento e 1 validação negativa passando. |
| `f01-backend-unit.log` | 367 testes, 89 arquivos aprovados. Lint/typecheck corrigidos; build backend aprovado. |
| `f01-postgres-retry.log` | Suíte PG completa registrada: 59 testes, 8 arquivos aprovados. |
| `f01-postgres-concurrency-final.log` | 10 testes F01 aprovados, incluindo duas renovações concorrentes e fronteira parcial de retenção. |
| `f01-migration-proof.log` | Schema anterior aplicado, dado legado inserido, migrations aditivas aplicadas e projeção anterior preservada. Sem backfill. EXPLAIN com seqscan desabilitado comprova aplicabilidade do índice; não é benchmark de produção. |
| `f01-frontend-unit.log` | 157 testes, 46 arquivos aprovados antes da regressão adicional de cache. |
| `f01-cache-red.log` | Teste revelou que o BFF descartava Cache-Control; correção acrescenta propagação do cabeçalho. |
| `f01-playwright.log`, `f01-playwright-retry.log` | Falha de seletor ambíguo entre alerta de negócio e anunciador do Next. Seletor passou a identificar a mensagem exata; servidor já negava corretamente. |
| `f01-pg-first.log` e `f01-postgres-concurrency.log` | Fixtures tentavam criar duas promoções ativas/reservas simultâneas proibidas pelas constraints atuais. Corrigidas para sobreposição histórica e pedidos pagos com reservas liberadas; constraints preservadas. |

S1: domínio foi validado em vermelho antes da implementação. Testes de componente foram escritos após a primeira composição; registrar essa diferença de sequência, sem apresentá-los como test-first. A validação de sensibilidade e a regressão final ficam registradas ao fechar a etapa.

## QA e revisão visual

Referências e direção estão no diário contínuo. Chrome DevTools inspecionou a jornada real autenticada em 1280×720 e 390×844. Hierarquia: filtros, totais, comparação e tabelas com captions e cabeçalhos de linha/coluna. Não há gráfico ou biblioteca adicional sem necessidade.

Texto secundário medido em rgb(92,107,127) sobre branco: contraste 5,43:1. Foco de teclado observado com outline azul de 3px; controles possuem labels. Documento privado permanece `noindex, nofollow`. Revisão identificou densidade dos indicadores, nota longa em tabela e margem dos controles; ajustes feitos no CSS Module/composição. Não equivale a auditoria completa de acessibilidade.

E2E exige filtros persistidos após reload, campanha sem cliques e CPC de R$1,00 com dez cliques, acesso negado real, recuperação de rede, teclado, fonte ampliada e 320px. A execução final e capturas devem ser registradas antes de concluir S6/S7.

## Migração, rollout e reversão

Migrations aditivas `20261016090000_promotion_investments` e `20261016090100_performance_query_index`; ambas instaladas em bancos descartáveis. Ordens/promoções antigas continuam legíveis, sem ledger artificial. A tabela não acrescenta contatos ou identificadores de visitantes; mantém referências financeiras existentes. Retenção de analytics inalterada; ledger acompanha a conservação dos pedidos, sem novo prazo inventado.

Antes de produção: medir volume/tempo e locks do índice em ambiente representativo, aplicar schema antes do código e verificar readiness, ativação/renovação e leitura. Não há autorização de deploy nesta execução. Em reversão, restaurar a aplicação anterior e conservar tabela/índice e todos os vínculos já gravados; não executar DROP ou apagar investimento. Novas ativações pela versão anterior ficarão sem vínculo e serão mostradas como cobertura financeira indisponível ao retornar à versão nova.

## Mapa de critérios

- F01-T01/AC01: PG acesso real com proprietário, outro dono, ADMIN atual, suspenso, sem sessão e tenant cruzado; E02 testa DOM e resposta negada.
- F01-T02/AC02: PG ausência de eventos, evento antigo ainda não expurgado e retenção parcial; componente distingue as mensagens.
- F01-T03/AC03: U03 e PG com 100 impressões/zero cliques; E01 alterna campanha e confirma CPC.
- F01-T04/AC04: U04 e PG com comparação de sete dias, leitura repetida sem efeitos e datas inválidas.
- F01-T05/AC05: U01/U02 e PG com pedidos em várias superfícies, sobreposição histórica, investimento conhecido/desconhecido e CPC do mesmo recorte.
