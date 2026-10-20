# Minha página: navegação e transferência — 19/10/2026

## Direção solicitada

O usuário pediu subseções expansíveis dentro de Minha página, a volta das abas e dos cards de ações na visão geral e a simplificação de /painel/perfil/exportar. Esta orientação supera a intenção anterior de manter a visão geral compacta sem abas.

Referência visual aplicada: o upload de foto já existente no produto. Sua base visual e interação foram extraídas para FileUpload, reutilizado por ImageUpload e pela importação da página. Nenhuma biblioteca foi adicionada.

## Alterações

- workspace-navigation.tsx/workspace.module.css: Edição, Ferramentas e Resultados e divulgação, com abertura independente, seção ativa aberta e permissões preservadas.
- profile-overview.tsx/profile-editor-toolbar.tsx: cards de ações e abas restaurados, mantendo os bloqueios de colaboração e somente leitura.
- components/ui/file-upload.tsx e file-upload.module.css: escolha por teclado/clique, arrastar arquivo, erro acessível e bloqueio de edição. ImageUpload reutiliza essa base, preservando prévia e remoção da foto.
- profile-export-screen.tsx e seu CSS Module: duas ações, Baixar minha página e Importar uma página. “Versão” tornou-se “O que deseja baixar?”, com Conteúdo em edição/Página que está no ar. Explicações longas removidas; consequências da substituição ficam na confirmação.
- A página de rota recebeu título privado correspondente. Endpoints, formatos de arquivo, limites, controle de versão, endereço e publicação mantêm os contratos existentes.

## Validação executada

| Verificação | Resultado |
| --- | --- |
| Lint e typecheck do frontend | Passaram |
| Build Next de produção pelo runner E2E | Passou; avisos existentes de CSS start/end e configuração Next |
| Suíte unitária completa | 388/389 passaram. F27-C03 em discovery-controls falhou por opção Online indisponível no popup; arquivo completo passou na repetição isolada (5/5). Falha intermitente permanece registrada |
| E2E Chromium desktop e mobile | 15/15, incluindo setup, F09-E01/E08/E11 e F38-E01–E04 |
| Acessibilidade automatizada na exportação | Nenhuma violação nas regras WCAG 2 A/AA e 2.1 AA executadas pelo teste |
| Inspeção visual das capturas | Desktop/mobile: cards, upload, foco do submenu e confirmação legíveis, sem sobreposição. Reflow verificado a 320 px com fonte a 200% |
| Funcional | Download, falha de conexão/retry, arquivo inválido, confirmação antes da substituição, endereço preservado, ausência de publicação automática, foto e ferramentas do editor |

Ambiente: Windows, Chromium Playwright, fixtures isoladas; projetos features e features-mobile (mobile emulado). E2E_PORT_OFFSET=10000 e E2E_RUN_ID=profile-subsections, sem encerrar serviços de desenvolvimento. PostgreSQL/Redis próprios do runner. Não houve validação em aparelho físico ou certificação integral de acessibilidade.

Comando de jornada no pacote frontend:

```powershell
$env:E2E_PORT_OFFSET='10000'
$env:E2E_RUN_ID='profile-subsections'
npm exec playwright test profiles.spec.ts profile-export.spec.ts -- --project=features --project=features-mobile --grep 'F09-E11|F09-E08|F09-E01/T|F38-'
```

Capturas revisadas em frontend/test-results: export-success.png (desktop/mobile), export-zoom.png (320 px/200%), import-confirmation.png (mobile), profile-overview-actions.png (desktop/mobile) e profile-menu-expanded.png. Esses arquivos são artefatos locais do runner e podem ser sobrescritos na próxima execução.

## Reversão

Reverter somente os trechos desta fatia nos arquivos acima e os testes correspondentes. Ao remover FileUpload, restaurar ImageUpload e seu CSS juntos. Não usar reset/revert amplo: a árvore já continha alterações de outras funcionalidades nos mesmos arquivos. Sem migração, alteração de backend, commit ou deploy nesta fatia.
