# Política padrão de grupos por conta

Implementação para novas segmentações, sem alterar schema, defaults globais, frontend ou dados de produção. Base informada: `71ef13f3`; alterações anteriores de documentação e cache do Graphify foram preservadas.

## Contrato

Config reutilizada: chave **`AFFILIATE_GROUP_POLICY_DEFAULTS`**, única por tenant. O valor JSON é validado integralmente por `groupPolicyInput`.

Configuração solicitada para a conta operada pela raiz:

```json
{"enabled":true,"disappearingSeconds":86400,"joinApproval":true,"autoApproveDelaySeconds":120}
```

Nenhum tenant está hardcoded no código. Contas sem essa chave continuam com os defaults legados do Prisma: política desativada, duração de sete dias, aprovação habilitada e atraso de 120 segundos. Uma configuração presente mas inválida bloqueia a criação com erro genérico 503; não desliga aprovação silenciosamente.

Rotas protegidas:

- `GET /api/v1/admin/affiliates/group-policy-defaults`: `{ configured, policy }`, com policy null quando ausente.
- `PUT` na mesma rota: recebe o objeto acima e retorna `{ saved: true }`.

O serviço de operação validado é `saveAffiliateGroupPolicyDefaults(db, tenantId, actorAdminId, policy)`, em `backend/src/use-cases/affiliates/group-policy-defaults.ts`. Também exige no banco um ADMIN ACTIVE do tenant, para não depender exclusivamente da autorização HTTP. Toda escrita gera `affiliate.group_policy_defaults.updated` no audit log.

A rota de criação de segmentação lê a configuração e cria o segmento na mesma transação, com lock do tenant compartilhado com a gravação dos defaults. O corpo de criação não aceita campos arbitrários de política. Grupos futuros continuam herdando a política da segmentação pelo fluxo existente.

**Salvar defaults não modifica retroativamente segmentos ou grupos.** Aplicar 24h/aprovação aos segmentos existentes e conferir o provedor são operações separadas da raiz, usando os serviços já existentes de política de grupos.

## Testes executados

TDD PostgreSQL: teste inicial falhou em 404 antes da implementação. Após implementação:

- Quatro testes novos de HTTP/serviço passaram: herança por conta, fallback de outro tenant, preservação de segmentos existentes, autorização/revogação, limites, ator de conta cruzada, conta bloqueada, configuração corrompida e reparo explícito.
- Conjunto PostgreSQL afetado: **65 testes aprovados em 4 arquivos**, incluindo regressões de política, operações e HTTP de afiliados.
- Unitários explícitos: **26 aprovados em 4 arquivos**.
- Lint focal dos três arquivos desta implementação: aprovado.
- Build backend: aprovado.
- `git diff --check` da rota: aprovado.

Banco próprio descartável `affiliate_defaults_regression_20261030`, no container local de preview existente na porta 5638. As 85 migrações existentes foram aplicadas; nenhuma migração nova foi necessária. Somente status de conexão simulado foi usado nos testes de criação. Não houve chamada ao WhatsApp real, implantação ou acesso a dados de produção.

## Trabalho paralelo e limites dos checks globais

O workspace contém busca combinada sendo escrita por outro trabalho. O lint global encontrou `_provider` não usado em discovery.ts; o typecheck, após corrigidos os tipos do novo fixture, encontrou apenas discovery.pg.spec.ts usando provider onde a versão paralela passou a expor providers. O teste unitário amplo teve 194 testes aprovados, mas uma suíte falhou enquanto o módulo combined-search ainda não existia. Esses arquivos foram preservados; não se declara o conjunto global verde. A raiz fará o CI do commit limpo selecionado.

Arquivos desta entrega:

- `backend/src/use-cases/affiliates/group-policy-defaults.ts`
- `backend/src/http/controllers/@Admin/affiliates.ts`
- `backend/src/http/affiliate-group-policy-defaults.pg.spec.ts`
- Este relatório

Nenhuma configuração de tenant foi gravada em produção por esta implementação. Sem commit, push, deploy, alteração de provider, frontend, mídia, campanha ou DNS. Para reverter a função, remover a leitura dos defaults na criação e as novas rotas/serviço; os valores de Config podem permanecer sem efeito ou ser removidos explicitamente pelo operador autorizado.
