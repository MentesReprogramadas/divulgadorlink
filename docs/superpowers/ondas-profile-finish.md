# Ondas — acabamento de perfil e estado de canal

Revisão pontual de 23/10/2026 na branch `codex/roadmap-f37-testes`.

Evidências anteriores abertas antes da edição:

- `output/ondas-demo/test-results/ondas-platform-coverage-On-87cca-via-de-página-compartilhada-ui-desktop/team-editor.png`.
- `output/ondas-demo/test-results/ondas-platform-coverage-On-c2d00-kit-com-recursos-publicados-ui-desktop/channel-unavailable.png`.

O grafo foi consultado antes do código; os dois callers atuais de `PersonalPageBrand` foram confirmados no código. Não existe um `ProfileStateLayout` compartilhado nesta revisão: `ChannelAccessState` compõe tanto o canal indisponível quanto a confirmação de idade.

| Antes | Depois | Motivo |
| --- | --- | --- |
| Atalhos fixados em três colunas por largura do viewport, incluindo o editor com prévia lateral. Um único atalho de equipe tinha aproximadamente 188 px e partia palavras. | Grade `auto-fit` com mínimo de 16 rem limitado a 100% do contêiner. Colunas se adaptam à área real; o único atalho ocupa a largura disponível. | Preserva textos completos, ícones, foco e ações sem comprimir o rótulo entre dois ícones. |
| `ChannelAccessState` usava a assinatura navy do footer pessoal sobre o fundo escuro da plataforma. | Variante tipada `platform` em `PersonalPageBrand`, selecionando o asset existente `/brand/ondas-logo.svg`. O caller da publicação pessoal mantém a variante padrão `personal`. | Recupera contraste no estado da plataforma sem modificar as paletas e o tratamento claro/escuro das publicações. |

Arquivos alterados neste lote:

- `frontend/src/features/profiles/components/profile-overview.module.css`.
- `frontend/src/features/profiles/components/personal-page-brand.tsx`.
- `frontend/src/features/profile-channels/channel-access-state.tsx`.
- `frontend/src/features/profile-channels/channel-access-state.test.tsx`.

Verificações executadas:

- Teste novo observado falhar antes da implementação porque o canal ainda usava `assinatura-claro.svg`.
- Vitest focal: 3 arquivos, 17 testes aprovados (`channel-access-state`, `profile-view`, `profile-editor`). Inclui a variante de canal e preservação da assinatura padrão pessoal.
- ESLint nos três arquivos TypeScript deste lote: aprovado.
- TypeScript do frontend com `--noEmit --incremental false`: aprovado.
- CSS alterado analisado por PostCSS: válido.

Não foram iniciados navegador, E2E ou build por este agente; a nova inspeção das duas telas no build final pertence ao fluxo serial coordenado pela raiz. A validação visual anterior identifica as causas, mas não constitui captura do resultado corrigido. Sem dependências, tokens globais, regras de negócio ou dados alterados neste lote. Reversão localizada: retornar somente estas duas correções, preservando as alterações anteriores já presentes nos mesmos arquivos.
