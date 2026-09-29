# Task 8 — Fix report

## Gap

Mapa LGPD exige que auditoria perca identificadores em `before` **e** `after`. `anonymizeAccount` só aplicava `stripIdentity` em `before`.

## Change

- Tipo de entrada: `after?` opcional em cada audit.
- Quando `after` existe, retorno inclui `after: stripIdentity(after, banned)` (mesma lógica de `before`).
- Fixture sem `after` inalterada; teste estende `a1` com `after` e espera `{ title: 'Receitas' }`.

## Scope respected

Sem alteração em links (status), pagamentos, job de limpeza, `retentionUntil` ou pseudônimo.

## Verification

`npm test` no backend — suite completa.
