# Revisão — linha temporal e filtros automáticos

18/10/2026. Complementa a implementação inicial de cards e abas, substituindo os gráficos de barras artesanais por uma biblioteca solicitada pelo usuário.

## Biblioteca escolhida

Foram consultados [Recharts](https://github.com/recharts/recharts), [Nivo Line](https://nivo.rocks/line/) e [visx](https://visx.airbnb.tech/). Recharts foi escolhido para esta fatia pela composição em React, SVG, suporte declarado ao React 19, tooltip, acessibilidade por teclado e menor necessidade de infraestrutura própria para esta linha temporal. Isso é uma escolha adequada a esta tela, não uma classificação universal de bibliotecas.

Instalado `recharts@3.10.1` (versão estável consultada no npm), licença MIT, e `react-is@19.0.0`, compatível com o React 19.0.0 existente. A instalação acrescentou 37 pacotes e alterou um pacote na árvore; nenhuma adoção de outra biblioteca de UI. Context7 consultou `/recharts/recharts`; os exemplos de documentação não eram fixados na mesma versão, por isso as propriedades utilizadas também foram verificadas pelo TypeScript e pelo browser na versão instalada. `npm ls` confirma react-is 19.0.0 deduplicado sob Recharts.

Os gráficos têm importação dinâmica em componente cliente; a tabela e o restante da aplicação não importam o módulo Recharts diretamente. Linha linear com todos os dias do período, eixos de data/quantidade, tooltip pt-BR, pontos e lacunas para valores indisponíveis (`null`, `connectNulls=false`). Não usa paginação no gráfico. A tabela conserva 7 dias por página. A segunda visualização usa BarChart horizontal por superfície. As animações dos dados são desabilitadas para previsibilidade e preferência de movimento; a interação de teclado permanece habilitada.

## Comportamento solicitado

- Gráficos são a aba inicial.
- Alterar datas ou campanha aplica após 450 ms, atualizando a URL por replace e preservando parâmetros, scroll e foco. Não há botão Aplicar período.
- Datas incompletas/inválidas não são enviadas. Erros de período do backend continuam editáveis. Voltar/recarregar preserva o contrato da URL.
- Retirados os textos de comparação do período, CPC indisponível, nenhum evento e dia atual em andamento.
- Se não há eventos, a seção de métricas de tráfego e as abas não são renderizadas. Investimento/CPC só aparecem quando existem os respectivos valores; investimento zero não cria card. Zero observado em uma série com eventos continua sendo zero, não ausência de cobertura.
- Avisos de retenção/cobertura e pagamentos antigos sem vínculo preservados. Ausência de histórico continua diferente de zero.

## Dados do link local

O banco configurado foi conferido: host localhost, NODE_ENV dev. O link `cmvebrmuu0004u44wmam8kh2q` foi encontrado no tenant esperado. Lote demonstrativo local com sessões prefixadas por `dev-performance-timeline-20261018:<linkId>:`: 16.333 impressões e 1.977 cliques, em 60 dias (20/08–18/10). Eventos pertencem somente ao link/tenant autorizado, nas superfícies ORGANIC e RELATED; nenhuma campanha, pedido, pagamento, permissão ou regra de rastreamento foi alterada.

Como o link foi criado em 18/10, esse histórico inclui datas anteriores à criação apenas para demonstrar a linha temporal. Os dados não representam audiência real. O tipo REAL segue o mecanismo do simulador de desenvolvimento existente (`backend/scripts/simulate-link-metrics.md`), pois o relatório de negócio exclui SYNTHETIC; não foram alteradas as consultas para incluir eventos sintéticos. O prefixo de sessão torna os eventos idempotentes e reversíveis sem remover tráfego preexistente.

Verificação pelo use case/repositório reais: período padrão 19/09–18/10, cobertura COMPLETE, 30 dias com cliques, 9.287 impressões e 1.189 cliques, investimento 0 e CPC nulo. Por isso, o link local mostra tráfego e não inventa cards de pagamento. `output/performance-timeline/seed-manifest.json` e `report-proof.json` registram os números.

Reverter somente os dados demonstrativos (a partir da raiz): `node output/performance-timeline/seed.cjs --rollback`. O script confere host local, ambiente, link e tenant; a exclusão se limita ao prefixo da sessão deste lote.

## Validação e limites

Vitest: 11 testes aprovados entre relatório e ícones/navegação. Lint e typecheck aprovados. Build de produção e E2E executados em serviços isolados com E2E_PORT_OFFSET=200, E2E_RUN_ID=performance-timeline e `.next-e2e`, preservando localhost:3000/3333 e o banco local populado. A suíte usa fixtures próprias; as capturas não são do link privado solicitado. Sem sessão do proprietário no navegador de inspeção; os dados desse link foram conferidos pelo backend local.

Inspeção visual de 1440×900 e 390×844, teclado, tooltip, 320 px, zoom de fonte a 200%, ausência de overflow, datas automáticas, campanha, reload, recuperação offline, acesso negado, vazio e retenção. Nenhum novo baseline foi aprovado automaticamente. Não houve validação em aparelho físico ou produção. Auditoria npm não apontou advisories em Recharts/dependências novas; permanece um advisory moderado da versão Next já existente, sem atualização de framework nesta fatia.

## Arquivos e reversão da UI

Na feature promotions: novo `components/performance-charts.tsx` e `performance-filters-form.tsx`; modificados `performance-details.tsx`, `performance-report.tsx`, `performance-report.module.css`, `performance-report.test.tsx` e `performance-screen.tsx`. Também alterados `frontend/e2e/promotion-performance.spec.ts`, `frontend/package.json` e `frontend/package-lock.json`. Para reverter a UI, retirar apenas o diff desta revisão e os dois módulos novos, sem desfazer a implementação anterior de cards nem outras alterações locais. O rollback dos dados é independente. Sem branch, commit, push ou deploy.

Execução final após ajuste de sincronização e foco: **11/11 E2E aprovados em 57,9 s**, com build de produção aprovado pelo setup. Axe sem violações no main nas abas de gráficos e tabela, em ambos os viewports. Unitários finais: **11/11**; lint/typecheck aprovados. Preservação de foco após autoaplicar comprovada também no mobile. Containers e serviços isolados removidos pelo teardown.

Capturas finais inspecionadas:

- [Linha temporal — desktop](timeline-desktop.png)
- [Linha temporal — mobile](timeline-mobile.png)
- [Tabela paginada](timeline-tabela.png)
