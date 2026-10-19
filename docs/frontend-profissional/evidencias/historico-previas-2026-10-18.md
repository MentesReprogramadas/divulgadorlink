# Comparação visual do histórico — 18/10/2026

## Alteração

“Ver diferenças” abre duas simulações da página: a versão histórica selecionada e o rascunho atual. A referência visual é a própria aba Aparência, explicitamente solicitada pelo usuário. A moldura e a renderização foram extraídas para `ProfileDevicePreview`, compartilhado pelas duas telas. Sem nova identidade visual ou dependências.

O diálogo usa a variante larga de `OverlayDialog`. As prévias ficam lado a lado em desktop e empilhadas abaixo de 48rem. A ação de restaurar fica abaixo delas. A comparação textual permanece em “Detalhes das alterações”, incluindo os campos que não aparecem na prévia e os canais.

Preservados: confirmação explícita, proteção contra restauração duplicada, `expectedVersion`, conflitos entre abas, restauração somente no rascunho e publicação posterior. Fotos indisponíveis não geram requisição da imagem antiga. As simulações são inertes, como na aba Aparência, evitando navegação acidental. Durante a restauração, o diálogo não fecha.

## Arquivos e reversão

- `frontend/src/features/profiles/components/profile-device-preview.tsx` e `.module.css`: moldura e simulação compartilhadas.
- `profile-appearance-editor.tsx` e `.module.css`: consumo da prévia extraída.
- `profile-revision-comparison.tsx` e `profile-history.module.css`: comparação visual e detalhes expansíveis.
- `frontend/src/components/ui/overlay-dialog.tsx` e `.module.css`: tamanho largo opcional; tamanho padrão preservado nos demais consumidores.
- `frontend/src/features/profiles/profile-history-screen.test.tsx` e `frontend/e2e/profile-history.spec.ts`: regressões da comparação e da restauração.

Reverter somente esses trechos e remover os dois arquivos da prévia compartilhada, recolocando sua marcação/estilo na aba Aparência. Não reverter o diretório completo: havia alterações anteriores e trabalho simultâneo na organização do editor, além de arquivos de output removidos pelo usuário.

## Verificação

- Lint: passou.
- Typecheck inicial e final: passaram. Uma repetição durante os builds locais encontrou conflito transitório entre tipos gerados em `.next` e `.next-e2e` (`LayoutRoutes` versus `never`); a execução após os builds passou sem alterar configuração ou código fonte para contornar o problema.
- Build normal: passou; avisos existentes sobre múltiplos lockfiles, plugin Next do ESLint e valores CSS `start/end`.
- Vitest: 15 testes passaram nos arquivos de histórico, aparência e editor. Após ampliar a cobertura das cores históricas, os 3 testes de histórico passaram novamente.
- Chrome DevTools: inspeção real do diálogo desktop, cores, molduras, rótulos e botão abaixo das prévias; sem overflow horizontal. Redimensionamento confirmou empilhamento. O Chrome dessa conexão limita a largura mínima da janela a 500px; as larguras de celular e zoom são verificadas pelo Playwright.
- Primeira execução E2E interrompida após identificar seletor antigo de “Histórico” no editor reorganizado; o cenário de conflito entre abas passou. Teste ajustado para abrir “Mais opções da página” quando a ação estiver recolhida.

Execução final: **5 testes passaram** (setup + 2 cenários desktop + 2 cenários mobile), em 1,8 minuto. Comando: `npx playwright test e2e/profile-history.spec.ts --project=features --project=features-mobile --output=../output/history-preview-final`, com `E2E_PORT_OFFSET=100`, `E2E_RUN_ID=history-preview`, PostgreSQL/Redis próprios e portas 3100/3433/4199/4543/5533/6480. Serviços preexistentes preservados. Sem deploy ou alteração do backend.

O E2E verificou disposição em duas colunas a 1280px e empilhamento a 390px, ausência de overflow horizontal no diálogo a 320px com fonte de 200%, restauração via teclado, preview existente, publicação posterior, isolamento de proprietário, erro offline e conflito entre abas. Axe não encontrou violações nas regras WCAG 2 A/AA e 2.1 AA analisadas; isso não certifica acessibilidade total. Capturas produzidas em Chromium/Windows foram abertas e examinadas. A rolagem interna do diálogo permite acessar a segunda prévia e a restauração em telas baixas. Não houve teste em aparelho físico, nem comparação automática contra um baseline visual anterior nesta mudança.

Capturas:

- [Comparação desktop](../../../output/history-preview-final/profile-history-F19-E01-E0-b299d-c-content-until-publication-features/profile-history-comparison.png).
- [Comparação mobile](../../../output/history-preview-final/profile-history-F19-E01-E0-b299d-c-content-until-publication-features-mobile/profile-history-comparison.png).
- [320px e fonte de 200%](../../../output/history-preview-final/profile-history-F19-E01-E0-b299d-c-content-until-publication-features-mobile/profile-history-comparison-320-zoom.png).
- [Conflito entre abas](../../../output/history-preview-final/profile-history-F19-E02-pr-efd8c--concurrently-updated-draft-features/profile-history-conflict.png).
