# Revisão de fluxos F24/F30/F35/F39/F26/F36/F40

Pedido: revalidar funcionamento e simplificar descoberta, navegação, busca, filtros, hierarquia e formulários. Branch `codex/roadmap-f37-testes`. Alterações de outras tarefas preservadas; nenhum novo commit/push/deploy autorizado por esta revisão. Evidências e resultados executados abaixo; validação local não equivale a produção.

## Diagnóstico e direção

Grafo consultado antes dos arquivos: 68 símbolos e 573 relações nas telas e navegação alvo, confirmados no código. F40 constava como não iniciada, sem rota ou tela; foi incluída conforme spec/plano na revisão solicitada dos sete pontos. Nenhuma expansão da F41.

| Área | Problema observado no código | Mudança e oráculo |
| --- | --- | --- |
| Sidebar | Edição, ferramentas, resultados, clientes e preferências acumulavam menus, inclusive três níveis | Seções Publicar / Cuidar e crescer / Conta, com um grupo aberto por vez e um único nível de itens. Rota ativa abre o contexto correto; permissões continuam filtrando cada destino. |
| F24 | Busca, nicho e seguidas só eram aplicados ao enviar formulário; visual de filtro interno de painel | Busca após pausa, categorias com o componente de facetas da home, toggle imediato de seguidas e limpar filtros. Sem botão Buscar. Mantém projeção pública, opt-in e seguimento pessoal. |
| F30 | Conexões e entregas misturadas, formulário sem orientação, identificadores genéricos “Destino 1”, resposta de workspace anterior sem proteção | Sistemas conectados / Entregas dos avisos, filtros e formulário Endereço → Avisos → Conferir. Domínio identifica receptor. Componente reinicia por workspace; 401/403 elimina dados/segredo em memória. |
| F35 | “Buscar nesta página” filtrava só os primeiros 25 contatos | Busca no servidor em todos os contatos autorizados, com pausa, filtros e exportação consistentes. Campo continua disponível durante carregamento; mudança de filtro reinicia cursor. |
| F39 | Escolha de idioma e publicação eram pouco explicadas; skeleton não mantinha prévia lateral | Orientação curta, rótulo “Idioma para traduzir”, etapas existentes e layout de prévia reutilizado no skeleton. Tradução manual e moderação permanecem iguais. |
| F26 | Configurar/publicar/iniciar eram ações pouco conectadas; números por variante em uma linha difícil de comparar | Guia de três passos, situação de configuração publicada/pendente e MetricCards por variante: viram botão, cliques e taxa. Mantém prazo, amostra, consentimento e método existentes. |
| F36 | Contexto de clientes diluído entre muitos menus; primeiro passo dependia de entender permissão de página | Contexto Contatos e clientes, orientação inicial explícita de convite F20 e busca após pausa. Portfólio, aprovação específica, transferência e relatórios mantêm os contratos existentes. |
| F40 | Só existia documentação | Tela Melhorar minha página com motivo/evidência/ação por sugestão, período e tipo, ausência de dados explícita e opção de ignorar sem editar a página. Ver D42 e execução F40. |

## Reutilização e referências

Direção dominante: padrões existentes do produto. Catálogo público usa Input/estilo de busca e FacetFilters/FacetBadge da home; não usa SearchBox de sugestões do catálogo, pois aqueles destinos são links de catálogo e não páginas pessoais. FacetBadge recebeu variante de seleção por botão, mantendo sua versão de link. Painel usa WorkspaceActions, WorkspaceFilters, ResponsiveTabs, FormSteps, OverlayDialog, Select, MetricCards, EmptyState, ErrorState e os skeletons existentes.

Referências primárias: [Atlassian Navigation System](https://atlassian.design/components/navigation-system/) para contextos/estrutura e [Carbon UI Shell Left Panel](https://www.carbondesignsystem.com/building-blocks/core/components/ui-shell-left-panel/guidelines) para hierarquia entre navegação de produto e tarefas. A página pública de documentação Atlassian foi inspecionada em Chromium isolado; isso não constitui inspeção de Jira interno. Refero não está disponível entre as ferramentas desta sessão; não foi contratado serviço nem instalada biblioteca. Não copiar identidade das referências.

Escolhas: manter cores, tipografia, marca, cabeçalho e controles da casa; reduzir profundidade e ações simultâneas; número/contagem só quando ajuda decisão. Alternativa de esconder toda a navegação num seletor de contexto foi descartada para preservar descoberta por menus convencionais. Accordion exclusivo evita a barra crescer conforme o usuário expande seções; não remove rotas ou permissões. Texto de ajuda aparece junto da decisão correspondente.

## Impacto e segurança

F35 adiciona `q` opcional de até 100 caracteres ao contrato de listagem/exportação. Busca parametrizada em valores dos campos conhecidos; não pesquisa notas privadas nem envia termos a analytics. Cursor, tenant, dono, retenção e permissões separadas de exportação/exclusão permanecem. Consumidores sem `q` continuam compatíveis.

F30 não muda eventos, assinatura, criptografia, retry, retenção ou saídas permitidas. Remontagem por workspace e sequência de leitura impedem resposta antiga na nova área; erro de autorização limpa dados, erro de rede conserva entradas. Chave mestra de produção/local não foi criada por uma revisão visual.

F40 reaproveita catálogo/disponibilidade, configuração salva, publicação, F31 e AuditLog; regras determinísticas e nenhum serviço externo. Não ativa medição, não muda preços, quotas ou moderação e não aplica correções automaticamente. Nenhuma migration nova. Colaborador com leitura da página não ganha acesso a métricas por esta rota.

## Validação executada

| Verificação | Resultado e escopo |
| --- | --- |
| Frontend Vitest | 120 testes em 35 arquivos aprovados: discovery, integrações, agência, diagnóstico, perfis, contatos, navegação e facetas. |
| Backend domínio/PostgreSQL | 54 testes em sete arquivos aprovados. Repetição final dirigida F40/checklist/interação: 25 aprovados após reforçar consulta de descartes, intervalo e expiração. Números se sobrepõem; não são 79 casos distintos. |
| Playwright sete áreas + sidebar | 53 aprovados, zero falhas/skips/flaky: features e features-mobile. [Relatório](evidencias/revisao-fluxos-2026-10-21/playwright-seven-features-sidebar.json). |
| Playwright refinamento guiado e leitura | 15 aprovados: F39/F26/F40 e consulta sem escrita; inclui setup. [Relatório](evidencias/revisao-fluxos-2026-10-21/playwright-final-guided-readonly.json). |
| Playwright recuperação final de leitura | Três aprovados, incluindo setup; prova recuperação de rede da comparação sem conceder escrita. [Relatório](evidencias/revisao-fluxos-2026-10-21/playwright-readonly-recovery-final.json). Rodadas se sobrepõem; não somar como casos únicos. |
| Typecheck/lint/build | Frontend e backend: typecheck, lint e build com exit 0 nos respectivos pacotes. [Resumo executável](evidencias/revisao-fluxos-2026-10-21/execution-summary.json). Build frontend mantém avisos existentes de suporte CSS start/end e plugin Next no ESLint; não bloqueiam a compilação. |
| Navegador e capturas | Inspeção real em Chromium, desktop 1440×960, documentação de referência e páginas locais. Capturas Playwright desktop/mobile e 320px examinadas: facetas, integrações, contatos, idiomas, comparação, clientes, diagnóstico e sidebar. W10 cobre 1024/1440/1920/390/320, teclado, grupo exclusivo e ausência de menus aninhados. |
| Acessibilidade/estados | Axe nas jornadas, foco/teclado/drawer e layout sem overflow; W07 exercita 200% de texto no painel. Erro/retry, vazio, loading, rascunho/publicação e leitura sem escrita exercitados nos cenários aplicáveis. Não é auditoria completa de todos os estados/zoom de cada tela nem teste em aparelho físico. |

Primeiro lote: 47 aprovados e seis falhas. Causas corrigidas: contraste do botão nativo das facetas (estilo explícito), locator de alert que também encontrava anunciador do Next e teste antigo que ignorava o grupo recolhido da sidebar. Uma repetição posterior encontrou somente locator de fechar diálogo: o nome acessível real era **Fechar janela**, não Fechar; corrigida a asserção. Relatórios anteriores preservados na pasta de evidências. Não se alteraram regras comerciais, tolerâncias visuais ou guardas para obter aprovação.

Ambiente: código copiado sem .env para pasta temporária isolada; npm/node_modules existentes, sem instalar dependência. E2E `E2E_RUN_ID=f40-ux-20261021`, `E2E_PORT_OFFSET=160`, servidores 3160/3493/4259 e containers próprios do harness. Testes PG dirigidos usaram somente `temlink-ux-review-pg-20261021:5559`, descartável. Nenhum reset/seed no banco pessoal nem chamada a destinatário real, WhatsApp, cobrança ou produção. As seis migrations do pedido anterior já estavam no banco local; esta revisão não adiciona migration.

## Decisões finais e limites

F39 permite consultar as etapas com acesso de leitura, recolhe o seletor de idioma e salva antes de navegar à prévia/revisão. F26 distingue configuração da publicação e conserva o rascunho antes de revisar. Ações de recuperar leituras não dependem de escrita. F30/F35 limpam dados em memória após perda de autorização e preservam entrada em falha de rede; histórico/carregamento continuam consultáveis por leitores. Nenhuma ampliação de grants.

F40 é análise determinística da configuração salva/publicação e F31; não varre URLs próprias, não promete ganho e não modifica conteúdo. F30 continua exigindo WEBHOOK_ENCRYPTION_KEY igual na API/worker para uso local real. DNS/TLS real da F10 e S7/CI/produção continuam pendentes. F41 não iniciada.

Reversão: retirar as mudanças desta revisão pelos arquivos/diff identificados, preservando as alterações simultâneas da árvore; não usar reset global. F40 pode ser desativada removendo sua entrada/rotas, mantendo auditoria existente. F35 q é opcional e não exige migração de consumidores. Não desfazer migrations do lote anterior para reverter esta UI. Sem novo commit, push ou deploy.

Arquivos principais: navegação em `features/account/components/workspace-navigation.tsx`; telas em `features/profile-discovery`, `platform-webhooks`, `contact-forms`, `profiles`, `agency` e `profile-diagnostics`; domínio/repositório/rotas F40 no backend, busca F35 em `repositories/contact-forms.ts`. Contratos e critérios em specs/planos F40, ledger CSV e matriz AC. Não foram alteradas dependências por esta revisão.
