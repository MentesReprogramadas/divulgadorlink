# CI — foco da confirmação de lembretes

Run `41102462021`, SHA `9ab8f835c3257a1b63c1000ffc6a5e4e65fce0fb`, job `124222879167` (`features-mobile 4/4`). O setup passou e 49 de 50 testes passaram. A falha foi `renewal-reminders.spec.ts`, F02-E03: a preferência persistiu e a mensagem **Preferência salva.** apareceu, mas não recebeu foco.

## Causa e correção

`ReminderPreferenceForm` chamava `setSaved(true)` e agendava o foco por `requestAnimationFrame`. O callback não garantia que o commit React já tivesse montado o parágrafo e preenchido sua ref; quando a ref estava vazia, a tentativa de foco era perdida.

Um teste controlado antecipando a entrega do frame reproduziu a falha antes da correção: mensagem presente, foco no body. O foco foi movido para `useEffect([saved])`, executado após o commit. Não foram alterados persistência, opção marcada, bloqueio de duplicação, tratamento de erro, regras comerciais nem o `toBeFocused()` do E2E.

## Verificação

- Novo teste de regressão falhou no código anterior e passou após a correção.
- Os cinco testes de `reminder-preference-form.test.tsx` passaram.
- Lint e typecheck do frontend passaram.
- Build de produção do executor E2E passou.
- E2E móvel F02 com PostgreSQL/Redis próprios: **3/3 passaram** em 1,9 minuto, incluindo build/setup. O caso F02-E03 passou mantendo o `toBeFocused()` original. Também passaram opt-in/e-mail/Pix explícito e isolamento privado/outro dono.

Executor padrão com `E2E_PORT_OFFSET=20000` e `E2E_RUN_ID=ci-focus-20261030`, após conferir portas livres e ausência dos nomes dos containers. Nenhum processo ou container alheio foi removido. Logs e artefato do job consultados em `output/ci-41102462021` (material de diagnóstico, fora do código de produção).

O teste unitário controla o agendamento para cobrir a ordem adversa; o E2E preserva o cenário real de offline, nova tentativa pelo teclado, foco e confirmação por reload. A nova execução no GitHub ficará com a tarefa principal. Nenhum commit/push/deploy executado por este agente.
