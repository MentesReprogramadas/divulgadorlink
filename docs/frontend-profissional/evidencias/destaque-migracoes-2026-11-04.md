# Revisão das migrações de destaque — 04/11/2026

Revisão local solicitada antes de integrar em main. Sem merge, commit, push, deploy ou acesso a produção.

## Bases verificadas

- Worktree: `C:/VSCODE/divulgadorlinks/.worktrees/destaque-pos-cadastro`.
- `main`: `20e776ec452055c1db30a40790720ddb062f2be8` (72 migrações).
- Base remota disponível no início do teste e `HEAD` executado: `0f9f0a7aeae2723e99eded2814e327983d563046` (90 migrações).
- `origin/main` após fetch posterior do coordenador: `7037643c8abd97ac2b91f2be82d69e33872c52e8`. Esta ref teve equivalência estrutural verificada, sem repetir o banco.
- Merge-base `main HEAD`: `20e776ec452055c1db30a40790720ddb062f2be8`.
- Esta revisão não alterou refs. O coordenador executou posteriormente apenas `git fetch origin main`, sem merge/rebase, para atualizar a informação remota. As 18 migrações extras de afiliados já pertenciam ao HEAD; não foram introduzidas pela funcionalidade de destaque. Elas também foram aplicadas com sucesso na base dedicada HEAD. Main local está atrás de origin/main.

## Migrações revisadas

1. `20261102170000_promotion_launch_offer`: cria tabela vazia de campanhas; PK textual, duas FKs compostas para usuário/tenant e link/tenant, `ON DELETE CASCADE`, dois índices de consulta e `createdAt` com horário do banco. Preço, prazo, nome congelado e reserva são escritos pelo servidor. Não modifica pedidos existentes.
2. `20261102173000_resume_card_checkout`: adiciona `orders.clientSecret TEXT NULL`, sem default ou backfill. Pedidos antigos mantêm NULL; pedidos novos podem persistir o segredo para retomada autenticada. O armazenamento é dado sensível de pagamento e deve seguir as proteções do banco; os DTOs públicos continuam excluindo esse campo.
3. `20261104150000_launch_offer_selection`: adiciona seleção opcional, `productCode TEXT NULL` e `durationDays INTEGER NULL`. CHECKs restringem códigos e durações suportados; NULL preserva campanhas da versão anterior. Não reemite campanha, não recalcula preços e não altera prazo.

Ordem cronológica válida: tabela de campanhas precede sua seleção; orders e chaves compostas de users/links já existem em ambas as bases. Os três SQLs permaneceram idênticos aos aplicados no harness; hashes estão em `output/destaque-migration-review-20261104/checksums.json`.

## Achado corrigido

O SQL das duas FKs de campanha usa `ON UPDATE NO ACTION` implícito; o schema Prisma omitia onUpdate, cujo padrão gerava CASCADE. `prisma migrate diff` reproduziu duas remoções/recriações de FK em ambas as bases.

Correção mínima: declarar `onUpdate: NoAction` nas duas relações novas de `PromotionLaunchOffer`. Mantém o comportamento já instalado e os checksums das migrações. Depois, o diff SQL/schema não contém nenhuma referência a campanhas, suas FKs ou `clientSecret`. `prisma validate` aprovou o schema.

Persistem diferenças SQL/schema anteriores à feature, como FKs de agência/perfis e, em HEAD, FKs de agendamento de afiliados. O diff global não está vazio; isso não foi tratado como correção de destaque. Não executar automaticamente o SQL gerado pelo diff. Os arquivos before/after registram o escopo exato.

## Teste real de upgrade

Container criado exclusivamente para esta revisão: `temlink-destaque-migration-review-20261104`, imagem local `pgvector/pgvector:pg16`, publicação `127.0.0.1:50860`. Bases `main_upgrade` e `head_upgrade`, ambas sem dados reais. Harness existente nas portas 5633/6580 foi preservado; nenhum container alheio foi parado/resetado.

Em cada base:

1. Exportar schema/migrações da ref exata para uma pasta de evidência e aplicar apenas a baseline com Prisma migrate deploy.
2. Inserir três pedidos anteriores: CARD PENDING_PAYMENT, PIX PAID e CARD EXPIRED; capturar snapshot integral.
3. Aplicar a primeira migração de destaque e criar campanha v1 já dispensada, com preço congelado, reserva e prazo; capturar snapshot.
4. Aplicar separadamente a segunda e a terceira migrações via migrate deploy.
5. Confirmar igualdade integral dos snapshots, descontando somente as novas chaves NULL. Confirmar `clientSecret` e seleção inicialmente NULL, sem valores inventados.
6. Rejeitar códigos/durações inválidos e referências cruzadas entre tenants. Confirmar persistência de segredo sintético e seleção válida.
7. Conferir cinco constraints (PK, duas FKs, dois CHECKs) e três índices (PK e dois índices explícitos). Testar cascades de exclusão de link e proprietário em transações revertidas.
8. Reexecutar migrate deploy e confirmar ausência de migrações pendentes. Resultado: main 72→75; HEAD 90→93. Todas as etapas passaram.

Comandos executados (caminhos das cópias de schema variam por baseline):

```powershell
python -u output/destaque-migration-review-20261104/run-review.py
node backend/node_modules/prisma/build/index.js migrate deploy --schema output/destaque-migration-review-20261104/main/prisma/schema.prisma
node backend/node_modules/prisma/build/index.js migrate diff --from-url $env:DATABASE_URL --to-schema-datamodel output/destaque-migration-review-20261104/main/prisma/expected-feature.prisma --script
npx --prefix backend prisma validate --schema backend/prisma/schema.prisma
```

`DATABASE_URL` aponta exclusivamente às bases dedicadas na porta 50860. A execução de diff acima é repetida para HEAD. O script não deve ser repetido sobre essas bases já populadas; ele contém fixtures únicas e cria a segunda base. Logs de cada deploy e `psql -v ON_ERROR_STOP=1` estão em `output/destaque-migration-review-20261104/`.

## Reversão e limites

Ensaio SQL real, em transação revertida em ambas as bases: remover seleção, remover clientSecret e remover tabela de campanhas, nessa ordem; comparar pedidos legados com snapshot original. PASS: estrutura antiga recuperável e pedidos originais preservados. O ensaio termina em ROLLBACK, mantendo schema e ledger Prisma coerentes no banco de revisão.

A reversão operacional preferível é recuar a aplicação mantendo as adições de schema. Uma remoção física elimina campanhas/preços congelados/prazos/seleções e dados de retomada dos cartões; não foi autorizada ou executada fora das transações de teste. Prisma não fornece down automático, e DROP manual não atualiza `_prisma_migrations`; qualquer reversão destrutiva exige plano próprio de backup e reconciliação do ledger.

O teste usa poucos registros determinísticos; não mede espera por locks de ALTER TABLE em tabela orders de produção nem duração sobre volume real. Adicionar colunas nullable sem default evita backfill, mas ALTER TABLE ainda requer lock. Os CHECKs da seleção também precisam validar campanhas existentes e podem ler a tabela; não houve medição desse custo em volume real. Esta revisão não certifica rollout em produção.

Regras de cooldown, reserva exclusiva e autorização permanecem no servidor com locks e testes; não são substituídas por CHECKs SQL. `reservedOrderId` continua um identificador opcional sem FK, conforme schema e implementação existentes da feature; preço JSON e expiração são validados pelo domínio, sem introduzir nova regra comercial na migração.


## Checks finais executados após a correção

No pacote backend, com `PG_SPECS=1` e `LAUNCH_OFFER_DATABASE_URL` apontando à base dedicada `head_upgrade`:

```powershell
npm test -- src/use-cases/@Promotions/launch-offer.pg.spec.ts src/use-cases/@Promotions/start-checkout.spec.ts src/http/controllers/@Promotions/launch-offer.spec.ts src/http/controllers/@Payments/resume.spec.ts src/domain/promotions/launch-offer.spec.ts
npm run typecheck
npm run lint
npm run build
```

Resultado: cinco arquivos, **37 testes aprovados**, incluindo PostgreSQL real e regressões de emissão, conflito, retomada, idempotência, idade e seleção parcial. Typecheck, lint e build também aprovados; schema validado com `prisma validate`. A execução Vitest durou 97,99s neste ambiente carregado; esse tempo não é benchmark de produção. Não foi necessário gerar novamente o Prisma client para a alteração declarativa de onUpdate; não se alterou nenhum tipo ou coluna.

Arquivos alterados nesta revisão: duas declarações de relação em `backend/prisma/schema.prisma`, este relatório e scripts/logs de prova em `output/destaque-migration-review-20261104`. Nenhum SQL de migração foi reescrito. Sem bloqueio encontrado na aplicação das três migrações em main ou origin/main; o drift global histórico, o main local atrasado e a ausência de ensaio com volume de produção continuam limites explícitos de integração.


## Confirmação da origin/main atualizada

Após o fetch realizado pelo coordenador, `origin/main` passou para `7037643c8abd97ac2b91f2be82d69e33872c52e8`, com HEAD mantido em `0f9f0a7aeae2723e99eded2814e327983d563046`. Os dez commits adicionais tratam afiliados. A equivalência foi confirmada diretamente pelo Git:

| Objeto versionado | HEAD testado | origin/main atual |
| --- | --- | --- |
| Tree `backend/prisma/migrations` | `6e1ecb5301733d4304abc02b5c77de16ad66eab8` | `6e1ecb5301733d4304abc02b5c77de16ad66eab8` |
| Blob `backend/prisma/schema.prisma` | `37021ff09835b69eab972a5cb4e5d0396e93c7e5` | `37021ff09835b69eab972a5cb4e5d0396e93c7e5` |
| Tree `backend/prisma` inteiro | `76cf3c44dee018b364ddf63b8374f6a1dd9f4873` | `76cf3c44dee018b364ddf63b8374f6a1dd9f4873` |

`git diff --exit-code HEAD origin/main -- backend/prisma` retornou código 0 sem diferenças. Os hashes acima comparam objetos versionados; as três migrações de destaque e a alteração local de schema continuam mudanças da worktree, fora desses objetos. As mesmas adições de destaque podem ser avaliadas sobre a nova origin/main porque sua baseline Prisma é byte a byte idêntica à executada no PostgreSQL dedicado.

Não houve novo teste de banco nessa confirmação: a evidência executada continua sendo `0f9f0a7a` mais as três migrações e a correção de schema. A conclusão sobre compatibilidade das migrações se estende à baseline `7037643c` pela igualdade dos objetos; isso não certifica automaticamente os fluxos de aplicação alterados pelos dez commits de afiliados. Nenhum merge, rebase, commit ou atualização de main local foi realizado.
