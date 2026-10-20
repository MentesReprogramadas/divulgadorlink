# Largura do painel e admin — 19/10/2026

Contêiner compartilhado sem teto de 1.440px, alinhado à esquerda e com margem lateral responsiva de 16–48px, seguindo o conteúdo da home (`src/app/home.module.css`). A home local foi inspecionada em Chromium: conteúdo com largura disponível e cabeçalho limitado a 1.440px. Nas áreas internas, cabeçalho e rodapé acompanham a nova largura. Navegação lateral e estados de carregamento compartilham a composição existente. Formulários e prévias mantêm seus limites locais de leitura.

Arquivos de implementação: `frontend/src/features/account/components/workspace.module.css`, `frontend/src/components/layout/site-shell.tsx`, `frontend/src/components/layout/site-shell.module.css`. Cobertura adicionada a `frontend/e2e/workspace-layout.spec.ts` (W09).

## Verificação

- `npm run lint`: passou.
- `npm run typecheck`: passou, incluindo E2E.
- `npm test -- src/components/layout/site-shell.test.tsx src/components/layout/site-navigation.test.tsx`: 11 testes passaram.
- Build de produção `next build`, executado pelo setup E2E em `.next-e2e`: passou.
- `E2E_PORT_OFFSET=12000 E2E_RUN_ID=workspace-width npm run test:e2e -- workspace-layout.spec.ts --project=features --project=features-mobile --grep 'W09|W04'`: 5 testes passaram (setup e quatro casos).
- W09: painel/admin em 320, 768, 1280, 1440 e 1920px; largura disponível, posição do logo, ausência de overflow e Axe com regras WCAG A/AA aplicáveis. Reflow com fonte a 200%, abertura do menu pelo teclado, Escape e retorno do foco passaram.
- Capturas desktop e mobile examinadas visualmente: `painel-1920.png`, `admin-visao-1920.png`, `painel-320.png`, `admin-visao-320.png`; também disponíveis as capturas de 1440px. Sem corte ou sobreposição nas regiões modificadas.

## Limites e divergências

A primeira execução mais ampla não passou: W01 aguarda o antigo grupo “Publicação”, ausente na navegação atual; W02 e casos posteriores encontraram conexão recusada após encerramento do servidor de teste. W09 inicialmente comparava a largura com clientWidth sem descontar scrollbar-gutter; a medição foi corrigida para a largura do contêiner pai e passou na repetição oficial. A execução final foi isolada e sequencial. Não foi declarada aprovação global da suíte nem conformidade integral de acessibilidade. A checagem a 200% usa fonte ampliada; não equivale a uma inspeção manual de todas as páginas com zoom do navegador. Nenhum teste em dispositivo físico ou produção.

Portas habituais estavam ocupadas e não foram encerradas. Foram usados bancos/serviços sintéticos do E2E com offset de portas e nomes próprios de containers. Não houve instalação, commit, branch, push ou deploy.

## Reversão

Remover somente a mudança da regra `.shell`, os atributos `data-workspace` e suas duas regras CSS, e o caso W09. Preservar as alterações preexistentes nesses arquivos; não reverter arquivos inteiros.
