# Busca: hierarquia e interação

Atualização de 15/10/2026, conforme pedido de separar sugestões e tornar a navegação evidente. Escopo visual: autocomplete da home/busca e apresentação da página de resultados, sem alterar ranking, elegibilidade ou contratos da API.

## Decisões

- Separar o destino de exploração (nicho/rede) dos links sugeridos por cabeçalhos e grupos nomeados. Referência de interação: [W3C APG — Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) e sua organização por grupos; [Atlassian Select](https://atlassian.design/components/select/code/) como referência complementar de agrupamento, sem adoção da biblioteca.
- Dar a cada sugestão uma linha inteira clicável, divisória, título forte e seta. Hover, seleção por teclado e foco tornam a ação perceptível sem depender só da cor.
- Exibir nicho e rede como metadados secundários abaixo do título, em badges compactos e não interativos. Não criar destinos concorrentes dentro da opção.
- Limitar a altura do painel com rolagem interna e manter o acesso a todos os resultados no rodapé. Setas/Enter/Escape seguem o [W3C APG — Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).
- Usar uma lista vertical de cards delimitados na página de resultados para preservar a leitura de título e descrição, em vez de quatro colunas densas. Separar patrocinados de links encontrados; destinos de nicho/rede têm ação explícita “Explorar”.
- Preservar URLs, surfaceToken, indicação de patrocínio e metadados de impressões. Respostas atrasadas de sugestões não substituem a consulta mais recente.

## Validação

Testes unitários cobrem agrupamento, metadados não interativos, destino rastreado, teclado e respostas fora de ordem. Verificação no Chromium local em 1440 px e 390 px inclui navegação real, ausência de overflow e axe WCAG A/AA. Dados demo não têm vetores para todos os 610 links; esta mudança não amplia a cobertura da busca semântica.

## Correção funcional de 17/10/2026 — sugestões versus resultados

O incidente `GET /bff/v1/search?q=Sa` expôs duas políticas diferentes: sugestões encontravam trechos do nome com ILIKE, enquanto a busca completa exigia relevância híbrida baseada em palavras inteiras e vetor. Um link sugerido podia desaparecer em “Ver todos os resultados”, especialmente sem embedding.

A busca completa agora considera a correspondência literal de trecho do nome como evidência textual, com piso igual ao peso textual configurado. SQL e ranking aplicam o mesmo piso; a relevância híbrida superior continua prevalecendo. Sugestões usam esse peso, em vez de uma nota fixa 1, para respeitar o mesmo limiar. `%` e `_` são tratados como texto literal. Não há mudança de valores de configuração, autorização, filtros públicos, idade, tenant, promoção ou tokens de métricas. A correção altera a seleção por nome; o escopo exclusivamente visual descrito acima refere-se à etapa de 15/10.

Arquivos de execução: `backend/src/use-cases/@Search/rank-links.ts` e `backend/src/http/controllers/@Search/routes.ts`. Cobertura: testes de ranking, HTTP, PostgreSQL e `frontend/e2e/search-regression.spec.ts`. O comparativo com a SQL antiga continua cobrindo a busca híbrida sem correspondência literal de nome; a nova seleção tem regressão própria.

Validação local: lint, typecheck e build nos dois pacotes; 34 testes unitários de backend, 7 de PostgreSQL e 3 do componente SearchBox. A configuração `frontend/playwright.search.config.ts` cobre Chromium desktop (1440×900) e mobile (390×844), sugestão, navegação por Enter e resultado para `Sa` sem vetor, além de limiar configurado acima do peso textual. Usa PostgreSQL/Redis descartáveis e um entry point exclusivo de E2E com embedding determinístico; a API real, o SQL e o BFF continuam no caminho. Capturas em `output/search-regression-20261017/`, inspecionadas visualmente. Esta validação funcional não constitui auditoria completa de acessibilidade nem prova do provedor de embeddings em produção.

Para reproduzir: no frontend, definir `E2E_PORT_OFFSET=6100`, `E2E_RUN_ID=search-regression-20261017` e executar `npx playwright test --config playwright.search.config.ts`. O setup verifica as portas e o teardown remove apenas os recursos da execução. O runner habitual mantém seu cenário de erro do provedor.

Reversão: retirar apenas os hunks desta correção nos dois arquivos de execução; remover os testes e o entry point dedicados se também for necessário retirar a cobertura. Em `frontend/e2e/serve.mjs`, reverter somente a escolha do entry point de busca, preservando as outras alterações locais. Não exige migration nem alteração de dados de produção. Nenhum deploy foi executado.

### Publicação autorizada em 17/10/2026

Após o pedido explícito de produção, a correção foi aplicada em um checkout isolado de `origin/main` e publicada no commit `43ffc05311dde0bc25f619a6b3ccd0b6dde48518`, preservando a ordenação aleatória e o `cache-control: no-store` da versão pública. Foram enviados somente os dois arquivos de execução e quatro arquivos de testes do backend, sem as demais mudanças da branch local. Checks sobre a main: lint, typecheck, build, 34 testes unitários e 7 PostgreSQL, estes com `--no-file-parallelism` porque as suítes usam TRUNCATE no mesmo banco descartável.

Deploys automáticos do Coolify concluídos: API `wipoutsqamjcqgh9dswm7yzv`, web `1h4rad92a6cf5dcselicoqy2` e worker `2wfknsbghuwchudrumsr7gpj`. API e web reportaram `running:healthy`. A consulta pública `Sa` passou de 6 sugestões e 0 resultados para 6 sugestões, 1 patrocinado e 5 orgânicos, sem nenhum ID sugerido ausente. O clique em “Ver todos os resultados” foi conferido no Chrome real, em desktop e viewport mobile 390×844. Evidência resumida: `output/search-regression-20261017/production-proof.json`. CI: https://github.com/MentesReprogramadas/divulgadorlink/actions/runs/39050433696.

Rollback deste hotfix: reverter somente o commit `43ffc05` na main e republicar; a base anterior era `06b9b0f`. Nenhuma migration ou edição de configuração foi incluída nesta publicação.
