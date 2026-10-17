# DatePicker personalizado — 17/10/2026

## Escopo e contratos

Criados `frontend/src/components/ui/date-picker.tsx`, CSS Module, cinco testes unitários e stories (vazio, preenchido, data/hora, desabilitado e dentro de modal). Substituídos sete campos em quatro consumidores: financeiro administrativo, relatório de destaque, acessos dos convites e término do destaque administrativo. Nenhum `input type="date"` ou `datetime-local` permanece em `frontend/src`.

Apresentação brasileira, transporte ISO, horário local e submissão GET preservados. A primitiva não acessa APIs, sessão, autorização, preço ou elegibilidade. Sem dependências, lockfiles, backend ou regras comerciais alterados nesta tarefa. Arquivos já modificados pelo usuário foram preservados e editados somente nos pontos de integração.

## Verificações

| Verificação | Resultado |
| --- | --- |
| `npm run lint` | Passou. |
| `npm run typecheck` | Passou, incluindo E2E. |
| `npm test` | 238 testes, 74 arquivos, passaram. |
| `npx playwright test --config playwright.date-picker.config.ts` | 6 testes passaram: desktop 1440×900 e mobile 390×844. |
| Chromium/Chrome DevTools | Inspecionados DOM, foco, seleção e composição em desktop/mobile. |
| axe no popover aberto | Sem violações na região analisada em desktop/mobile. |
| Layout | Capturas revisadas em desktop/mobile; verificado 320 px sem overflow horizontal. |
| Texto ampliado | 200%, viewport 1440×900 e 720×450: popover cabe horizontalmente e limita altura com rolagem. |
| Build e E2E das jornadas | Build de produção do setup passou; 17 testes passaram, incluindo setup, resultados e convites em desktop/mobile. |

Cobertura: data real/ano bissexto, valor ISO em FormData, erro e correção pelo calendário, edição parcial controlada, mudança externa, reset, horário inválido, seleção preservando horário, disabled, Enter/setas/PageDown, Escape, retorno de foco, Hoje/Limpar e portal dentro de dialog sem fechar o formulário pai. Capturas determinísticas: relógio em 17/10/2026, seleção em 18/10/2026, animações desabilitadas.

Capturas revisadas: `output/date-picker-validation/calendar-desktop.png` e `calendar-mobile.png`. Teste reproduzível: `frontend/e2e/date-picker.spec.ts`; configuração dedicada inicia/reutiliza Storybook na porta 6007 e não exige banco.

Jornadas executadas em `output/date-picker-validation/frontend`: `E2E_PORT_OFFSET=18000 E2E_RUN_ID=datepicker npx playwright test --project=features --project=features-mobile redirects.spec.ts promotion-performance.spec.ts`. Resultado final: 17 esperados, zero falhas, zero ignorados, zero flaky. Relatório em `test-results/results.json` dessa cópia e build em `e2e/.runtime/server.log`. Setup/teardown criaram e removeram somente os containers dessa execução. A cópia final da primitiva foi usada na segunda execução das jornadas.

## Ambiente isolado e limites

As portas 3000/3333 estavam ocupadas; os processos existentes não foram encerrados. A primeira tentativa de build no diretório ativo compilou, mas falhou na coleta de páginas por chunk ausente no cache `.next` compartilhado com o servidor em execução. A validação foi repetida na cópia `output/date-picker-validation`, com dependências locais reutilizadas e banco descartável. A primeira porta alternativa 10000 também estava ocupada; a execução usou offset 18000 e containers com sufixo `datepicker`.

Não houve teste em aparelho físico ou leitor de tela. Ampliação textual e redução de viewport não comprovam zoom nativo do navegador; `zoom: 2` em CSS no elemento raiz deslocou o posicionador do Base UI e não é usado no produto. A análise axe cobre somente a região do calendário. Não foi criada baseline visual automaticamente. Não houve deploy.

## Reversão

Reverter somente as integrações DatePicker nos quatro consumidores e os ajustes de formato esperado nos testes; depois remover os arquivos novos da primitiva, stories, configuração e E2E dedicado. Remover o símbolo `calendar` e as entradas documentais desta tarefa se não houver consumidores. Não usar restauração integral dos arquivos pelo Git: eles continham outras alterações locais antes desta tarefa.
