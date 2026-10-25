# Evidências — refinamento de páginas, 21/10/2026

Dados sintéticos, Chromium/Playwright em Windows. Emulação mobile; sem aparelho físico ou produção. Regressão: 25/25; complemento dos cards: 3/3, ambos incluem setup. Resumo em execution-summary.json. Os hashes dos onze arquivos centrais conferem com a cópia testada; a árvore contém trabalho simultâneo de outras tarefas.

## Comandos e resultados

- Frontend: npm run typecheck; npm run lint; npm run build; npx vitest run src/components/layout src/components/domain src/features/account src/features/profiles src/features/profile-discovery src/features/agency src/features/contact-forms src/features/workspace-team src/features/profile-interaction. 207 testes/53 arquivos, exit 0.
- Backend: npm run typecheck; npm run lint; npm run build; npx vitest run src/domain/access/workspace-permissions.spec.ts. Quatro testes, exit 0.
- Playwright final: page-refinements, profile-discovery, contact-forms, profile-history, agency e workspace-layout; projetos features/features-mobile; grep UX|F36-E01|F22-G01|F19-E01|F24-|W10|W05; max-failures=1. E2E_RUN_ID=f24-page-refine4-20261021, offset 180. Resultado 25/25 em playwright-regression.json/log.
- Complemento: page-refinements.spec.ts, grep UX04, ambos os projetos. E2E_RUN_ID=f24-page-refine5-20261021, offset 180; 3/3 em playwright-cards-zoom.json/log.

## Capturas e inspeção

Desktop/mobile: busca, formulário e descoberta isolados; prévia iPhone e comparação; aviso amarelo; diretório com muitas categorias; cards em 320/390/768/1440px e fonte 200%. As capturas directory-card foram substituídas aqui apenas pelas do último complemento, mantendo os relatórios anteriores separados. Inspeção visual humana realizada; não são baselines automaticamente aprovados nem uma suíte visual de todas as páginas.

Em zoom, os rótulos dos botões podem ocupar mais linhas para permanecer visíveis; os dois controles ficam lado a lado. CardTitle mantém título em uma linha, e CardDescription expande/recolhe a descrição. Controles e ícones não são removidos.

## Iterações anteriores

playwright-initial.json: 5/7, correção de categoria extensa e seletor durante streaming. playwright-second.log: 43/49, expectativas antigas. O JSON dessa rodada não foi preservado antes da próxima limpeza do harness; seu log completo registra as seis falhas. playwright-third.json/log: 19/25, camada invisível de ResponsiveTabs expandindo a largura e deslocando diálogos no mobile. A correção já presente na árvore compartilhada foi sincronizada e revalidada na rodada final 25/25. Não se aumentaram timeouts ou tolerâncias para silenciar falhas.

Logs de lint/typecheck/unit/build anexados. Source-hashes registra os arquivos centrais iguais entre fonte e cópia final. Containers próprios removidos pelo teardown; nenhuma migration/seed no banco pessoal, mensagem real, commit, push ou deploy.
