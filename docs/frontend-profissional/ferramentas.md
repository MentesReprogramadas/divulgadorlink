# Ferramentas, MCPs, bibliotecas e Skills

Pesquisa e verificação: 15/10/2026. Fontes dos mantenedores e metadados do npm; versões fixadas para reprodutibilidade, sem dependências adicionadas à aplicação.

## Distinções

MCP é a conexão que expõe ferramentas ao agente. Um servidor pode pesquisar componentes ou controlar um navegador, sem instalar uma biblioteca no produto. Biblioteca é código usado pela aplicação. Storybook é um ambiente de desenvolvimento/documentação; Playwright Test é um executor de testes. Skill descreve um procedimento reutilizável. AGENTS.md contém regras duradouras do projeto. Nenhum desses recursos substitui decisões de produto ou prova de qualidade.

## Matriz e estado real

| Recurso | Tipo e função | Compatibilidade/requisitos | Configuração e verificação | Decisão |
| --- | --- | --- | --- | --- |
| Context7 | MCP HTTP; documentação técnica | Codex suporta HTTP; uso sem chave tem limites; versão da documentação deve ser checada | https://mcp.context7.com/mcp; initialize, tools/list e resolve-library-id para Next.js executados com sucesso | Ativo no projeto. Sem credencial adicional nesta etapa. |
| shadcn/ui | MCP de registry + catálogo de código; biblioteca somente se adotada | shadcn 4.21.5 exige Node >=20.18.1; Node local 24.21.0 compatível | npx -y shadcn@4.21.5 mcp; initialize, tools/list e search_items_in_registries executados | Ativo para consulta. Não executado init/add; nenhuma biblioteca de UI instalada. |
| 21st.dev, antigo Magic | MCP HTTP; pesquisa e geração React | Mantenedor documenta Codex; requer nova chave API_KEY_21ST | https://21st.dev/api/mcp, header x-api-key obtido por variável de ambiente | Configurado desativado: credencial ausente. Sem teste autenticado ou geração. |
| Chrome DevTools | MCP local; navegador, DOM, estilos, rede, console e desempenho | chrome-devtools-mcp 1.11.0 exige Node ^20.19.0 / ^22.12.0 / >=23; navegador Chromium disponível | initialize, tools/list e list_pages executados com Chromium local | Ativo com perfil isolado, headless, telemetria e integração CrUX desativadas. |
| Playwright Test | Ferramenta e biblioteca de testes já instalada | @playwright/test ^1.55.0 no frontend; setup atual usa Docker/PostgreSQL/Redis | npm run test:e2e já existe | Reutilizar; adicionar screenshots determinísticos na fase do piloto. Nenhum Playwright MCP duplicado necessário. |
| Storybook | Ambiente de componentes, stories, documentação e interação | @storybook/nextjs-vite 10.6.2 declara Next 14/15/16 e React 19; Vite >=5; RSC experimental | storybook e adapter fixados em 10.6.2; scripts storybook e build:storybook no frontend | Instalado após validação do piloto. Catálogo de variantes, campos, feedback e landing; build estático passou. |
| Refero Design | Skill/metodologia e MCP de referências quando disponível | Última chamada MCP retornou assinatura inativa | Skill utilizável com referências externas e produto atual | Complementar com fontes abertas; sem assinatura paga. |
| Fontes abertas de design | Documentação e produtos, não MCP | Atlassian, GOV.UK, Carbon, Linktree e Linear | Fontes e papéis registrados em design-system.md | Evitar dependência exclusiva de um catálogo ou cópia de uma marca. |
| Coolify e ferramentas atuais | MCPs e plugins existentes | Configuração global preexistente | Arquivo global não foi alterado | Preservados. Fora da validação de UI local. |

Context7 retornou versões de Next.js, mas não a versão exata 15.5.26 na resposta consultada. Não apresentar documentação da versão 16 como regra do projeto; confirmar detalhes em documentação oficial ou código da versão instalada.

## Fontes oficiais e comandos

- [Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli): .codex/config.toml por projeto confiável; HTTP e stdio, filtros de ferramentas e variáveis para headers. Comandos codex mcp list e codex mcp get NOME inspecionam a configuração.
- [Context7, cliente Codex](https://github.com/upstash/context7/blob/master/docs/clients/codex.mdx) e [servidor](https://github.com/upstash/context7/tree/master/packages/mcp): alternativa local npx -y @upstash/context7-mcp --api-key CHAVE. Foi escolhida a conexão HTTP para não instalar outro runtime local.
- [shadcn MCP](https://ui.shadcn.com/docs/mcp): configuração manual para Codex. A consulta ao registry padrão não exige components.json. Esse arquivo e shadcn init/add não foram criados/executados.
- [21st MCP / migração de Magic](https://github.com/21st-dev/magic-mcp/blob/main/README.md): instalador oficial npx @21st-dev/cli@latest init --client codex. Escolhida configuração HTTP explícita para preservar os arquivos existentes. Chaves antigas de Magic foram substituídas; pacote legado é proxy de compatibilidade, não a instalação recomendada.
- [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) e [configuração de clientes](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/client-configurations.md): npx -y chrome-devtools-mcp@latest; configuração local fixa 1.11.0. --help consultado para executablePath, isolated e flags de telemetria.
- [Storybook Next.js/Vite](https://storybook.js.org/docs/get-started/frameworks/nextjs-vite): custo de configuração e mocks cresce em componentes acoplados a cookies, sessão e Server Components. Começar com componentes de apresentação; não usar RSC experimental como prova de integração do servidor.
- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots): toHaveScreenshot compara renderizações; ambiente, browser, fontes e dados precisam ser consistentes. MCP de automação não substitui esse executor.

Os comandos com CHAVE são exemplos documentais: não gravar valores em args/configuração ou histórico. A configuração efetiva de 21st usa env_http_headers e não contém segredos.

## Configuração adotada

Arquivo .codex/config.toml na raiz do repositório; configurações globais e MCPs existentes preservados. Novos nomes: context7, shadcn, chrome_devtools e twentyfirst. Não duplicar o servidor existente de navegador para tarefas comuns: Chrome DevTools é o recurso especializado para diagnóstico; escolher um controlador por sessão para evitar estados divergentes.

shadcn tem allowlist das sete ferramentas observadas no handshake. Elas consultam registry, exemplos e comandos sugeridos; executar o comando sugerido continua sendo uma alteração de dependência que exige uma decisão de adoção. Nenhuma ferramenta é tratada como autorização para substituir o design system.

Chrome não está instalado nos locais padrão desta máquina, mas há Chromium distribuído pelo Playwright. O caminho local testado está explícito na configuração. Esse caminho e cwd são específicos desta estação Windows; revisar antes de compartilhar a configuração com outra máquina. Após limpar/atualizar os browsers do Playwright, resolver o novo caminho e refazer list_pages. Não apontar para o perfil pessoal nem abrir debugging remoto publicamente.

O Codex precisa carregar novamente os servidores após a mudança de configuração, normalmente em uma nova sessão ou reiniciando o cliente. Conexão independente pelo SDK comprova disponibilidade do servidor; não comprova que esta conversa já recebeu as ferramentas novas. Verificar o status no cliente após recarregar. Projeto precisa estar confiável para carregar a configuração local; não alterar trust global silenciosamente.

Para ativar 21st: obter a chave no serviço oficial, disponibilizar API_KEY_21ST no ambiente herdado pelo Codex, habilitar twentyfirst e reiniciar/carregar os MCPs. Fazer initialize/tools/list, uma pesquisa e só então avaliar geração. Não solicitar a chave em chat. Custos, limites de geração e licença de cada componente não foram validados sem conta; não prometer gratuidade ou licença uniforme.

Context7 funcionou anonimamente. Se exigir autenticação futuramente, usar o mecanismo oficial e uma variável de ambiente, sem tentar repetidamente contornar limites. Para HTTP com Bearer, Codex suporta bearer_token_env_var. Não executar ctx7 setup automaticamente: o instalador também pode modificar AGENTS e config global.

## Manutenção e custo

Metadados npm consultados: shadcn 4.21.5 atualizado em 14/10/2026; chrome-devtools-mcp 1.11.0 em 15/10/2026; @upstash/context7-mcp 4.4.1 em 13/10/2026. Isso indica atividade recente, não garantia de estabilidade. Context7 HTTP é operado remotamente e pode mudar sem atualizar este arquivo. 21st migrou de produto; rever seu README antes de reativar uma configuração antiga.

Fixar versão dos executáveis locais e revisar changelog antes de atualizar. Após alteração, repetir initialize, tools/list e uma chamada representativa; verificar Node e navegador. Não rodar todos os MCPs em todas as tarefas: documentação, pesquisa de componentes, inspeção e testes têm finalidades distintas.

Storybook tem valor para variantes, estados e desacoplamento, mas não é dependência para melhorar a landing. Na fase 2, instalar apenas o framework/adapters/addons necessários, mostrar custo de dependências, build estático e integração em CI. Não contratar Chromatic ou outro serviço para habilitar screenshots locais. Manter E2E real para cookies, autenticação, pagamentos e tenant.

## Limitações verificadas

Sem chave de 21st e sem teste autenticado; Refero indisponível na chamada anterior. Após a autorização de implementação, Storybook foi instalado e compilado, e o piloto foi implementado. A verificação atual da UI está registrada em implementacao.md. Uma tentativa de consulta ao Stripe Directory para descoberta falhou por conteúdo não suportado; CLI Stripe ausente. Não foi instalado um fluxo de pagamentos para pesquisar ferramentas de desenvolvimento; a verificação técnica usou as fontes oficiais acima.
