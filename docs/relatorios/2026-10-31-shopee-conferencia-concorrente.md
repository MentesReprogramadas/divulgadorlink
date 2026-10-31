# Correção de concorrência na conferência Shopee — 31/10/2026

## Causa comprovada

`generateTenantShopeeAffiliate` e `verifyShopee` liam a conexão antes da chamada externa e gravavam `CONNECTED` com comparação de `updatedAt` e status exato. Uma geração bem-sucedida atualiza `updatedAt` pelo Prisma. Outra operação simultânea, com a mesma conta e as mesmas credenciais, falhava como se houvesse alteração administrativa. A transição normal `CONFIGURED` → `CONNECTED` também provocava o conflito.

Três regressões determinísticas reproduziram os erros antes da correção: gerações simultâneas a partir de CONFIGURED e CONNECTED; verificação simultânea a uma geração. As três passaram após a correção.

## Mudança

Os dois filtros de gravação continuam exigindo o mesmo id, tenant e conteúdo criptografado de credenciais. Aceitam status CONFIGURED ou CONNECTED, sem usar timestamps de atividade como revisão de configuração. DISCONNECTED e RECONNECT continuam bloqueados. Configurar novamente produz novas credenciais criptografadas e invalida a operação em curso.

`affiliateRevision` já ignora timestamps de atividade e normaliza os dois status utilizáveis. Seu contrato e os tokens existentes não foram alterados. Não houve alteração em preço, envio, autorização, contas ou credenciais reais.

## Verificação executada

- Antes da mudança: 3 falhas novas reproduzindo os erros exatos de configuração alterada; 6 testes passaram.
- Após a mudança: 36 testes unitários dirigidos passaram (use-case Shopee, adapter Shopee e revisão de produto).
- PostgreSQL descartável: 4 testes passaram, incluindo a jornada de descoberta/prévia/envio com provedores simulados, duas origens de geração simultânea, revisão de conta estável e bloqueio de rotação real de credenciais no banco durante a chamada simulada.
- Backend: lint, typecheck e build passaram.
- Diff dos três arquivos sem erros de whitespace.
- Suite ampla backend: 1.037 testes passaram, um ignorado e duas provas Pix falharam. Ambas apontam `The column emailDigest does not exist in the current database` no banco local padrão das provas. Não houve alteração desse banco ou do escopo financeiro para contornar a falha.

A prova PostgreSQL criou e removeu apenas `affiliate_shopee_concurrency_regression_20261031`, no container local existente. Nenhum envio ou alteração em produção foi executado. Evidência local: `output/shopee-confirmation-fix/pg.log`.

## Limites e reversão

A conferência contra a Shopee real após publicação cabe à validação integrada. O patch elimina o conflito local comprovado; falhas genuínas de rede ou indisponibilidade do produto continuam possíveis. A recuperação de item no mesmo lote é implementação separada.

Reversão: restaurar os dois filtros de updateMany em `backend/src/use-cases/affiliates/shopee.ts` para a revisão anterior. Não há migration, dependência ou alteração de contrato a reverter.


Integração final do agente principal: a suíte foi repetida com PostgreSQL/Redis exclusivos e migrations atuais. Passaram25testesPG de agenda/Shopee e1039testes gerais, um ignorado. As duas falhas Pix da tentativa no banco local antigo não se repetiram no ambiente preparado. O ajuste mantém affiliateRevision compatível com agendas já aprovadas.
