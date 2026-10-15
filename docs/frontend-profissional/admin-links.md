# Gestão de links e destaque administrativo

Implementação e validação local em 15/10/2026. Sem branch, commit, push ou deploy.

## Comportamento

Em Admin → Gestão → Links, o administrador pode buscar e filtrar Todos, Publicados, Aguardando revisão, Pré-rejeitados, Rascunhos e Fora do ar. A API recebe `q` e `status`. As contagens consideram todos os links do tenant que correspondem à busca, antes do filtro de status e do limite de 40 resultados. A interface informa quantos cards foram carregados e orienta a refinar a busca quando necessário.

O código anterior excluía rascunhos da lista de gestão. A solicitação de acompanhar cada status inclui agora rascunhos na visão administrativa. Eles permanecem fora do catálogo e não recebem ações de publicação ou destaque.

| Status | Tratamento e ações |
| --- | --- |
| Publicado | Etiqueta verde; ver no catálogo, gerenciar destaque e tirar do ar com confirmação. |
| Aguardando revisão | Etiqueta âmbar; abrir a revisão do link na moderação ou retirar o envio com confirmação. |
| Pré-rejeitado | Etiqueta vermelha; explicar a espera por ajustes/contestação e permitir retirar o envio. |
| Rascunho | Etiqueta neutra; informar que o envio não foi concluído. |
| Fora do ar | Etiqueta neutra forte; informar que não pode ser republicado. |

O destaque administrativo começa ao salvar e permite 7, 14 ou 30 dias, data/hora de término ou prazo indeterminado. O horário personalizado usa o fuso do dispositivo; a API recebe ISO com fuso. `expiresAt = null` representa ausência real de prazo. A edição preserva a ativação das superfícies que continuam ativas. A remoção cancela somente os destaques administrativos.

## Contratos e persistência

- `GET/PUT/DELETE /api/v1/admin/links/:id/promotions`: autenticação, papel e estado reais da conta administrativa, tenant e elegibilidade verificados no servidor. O BFF encaminha PUT e DELETE preservando cookies e CSRF.
- Somente links publicados de contas ativas podem receber destaque; HOME continua indisponível para conteúdo com restrição de idade, tanto do nicho como da rede.
- `Promotion.administrative` identifica a concessão; a migration `20261015180000_admin_promotions` permite prazo nulo e mantém uma constraint exigindo prazo para promoções pagas.
- Mudanças e auditoria são transacionais. O bloqueio do link serializa a concessão com o checkout. Destaques pagos e pagamentos pendentes não são sobrescritos. Destaques administrativos não são renovados pelo checkout e não geram pedidos nem cobranças.
- Consultas públicas de HOME, NICHE, busca híbrida e sugestões respeitam o vencimento administrativo. A expiração não exige a execução de um worker. A semântica legada dos destaques pagos não foi alterada.
- Patrocinado, surfaceToken e eventos públicos continuam usando os caminhos existentes. Suspensão e retirada do link continuam cancelando suas promoções.
- `GET /api/v1/admin/office` mantém autorização e isolamento. A ação de revisão navega para `/admin/moderacao?link=...`, filtrando a fila já autorizada, sem aprovar ou republicar automaticamente.

## Arquivos principais

- `backend/prisma/schema.prisma` e migration acima.
- `backend/src/http/controllers/@Admin/promotions.ts`, `office.ts` e registro de rotas.
- `backend/src/use-cases/@Admin/change-admin-promotions.ts` e stores de checkout.
- Consultas em `http/catalog-page.ts`, `controllers/@Search/routes.ts` e `use-cases/@Search/rank-links.ts`.
- `frontend/src/features/administration/components/admin-links-board.*` e `link-promotion-editor.*`.
- Composição em `app/admin/visao/office.tsx`, fila/página de moderação e métodos do BFF.
- Testes da feature, HTTP, PostgreSQL e `frontend/e2e/admin-promotions.spec.ts` com configuração própria.

## Referências e decisões visuais

Direção fixada no Design System e na gestão existentes: navy, superfícies claras, tipografia, controles e foco compartilhados. A consulta Refero retornou `NO_SUBSCRIPTION`; não houve contratação. A referência `refero-design/references/craft-details.md` fundamentou campos rotulados, foco e recuperação de formulário. O Design System do projeto fundamentou hierarquia, espaçamento e contraste. Nenhuma biblioteca foi instalada.

| Decisão | Fundamentação |
| --- | --- |
| Filtros com texto, total e seleção persistente | Pedido do usuário; contagens reais antes do limite. |
| Status por texto, borda e cor | Pedido do usuário e exigência de não depender apenas de cor. |
| Ações diferentes por estado | Máquina de estados e fluxos existentes; sem novas transições comerciais. |
| Diálogo nativo para destaque | Confirmação contextual, captura de foco e retorno ao botão de origem. |
| Componentes coesos e CSS Modules | Arquitetura do programa de frontend; nenhum aumento de especificidade global. |

## Verificação

| Check | Resultado |
| --- | --- |
| Backend: lint, typecheck e build | Passaram. |
| HTTP/admin, retirada, suspensão, checkout e renovação afetados | 37 testes passaram. |
| PostgreSQL: nova concessão, checkout, catálogo e busca | 25 testes passaram em banco isolado; cobrem prazo nulo, vencimento, transação, auditoria e proteção de destaque pago. |
| Frontend: typecheck e lint dos arquivos alterados | Passaram. |
| Frontend: editor, BFF, filtros/cards e fila selecionada | 11 testes passaram. |
| Playwright Test: destaque e filtros/status, desktop e mobile | 4 testes passaram em 1440×1000 e 390×844. Contagens verificadas com 49 links por lote, incluindo 45 publicados. |
| Acessibilidade e interação | Axe sem violações nos recortes do diálogo e da seção de links; teclado, foco inicial, retorno de foco, Escape, rótulos e ausência de overflow verificados. Não equivale a certificação de acessibilidade integral. |
| Reflow equivalente a zoom de 200% | Viewport CSS de 720×500, diálogo contido e botão de salvar alcançável pelo foco. Captura inspecionada. Não foi teste em dispositivo físico. |
| Compilação Next na cópia isolada | Passou, incluindo checagem de tipos; lint do build foi desabilitado somente nessa cópia devido à falha externa abaixo. |

Limites observados: o lint completo do frontend falha em `features/catalog/components/home-catalog.tsx` por `notice` não usado. A suíte completa do frontend apresentou quatro falhas em catálogo/envio; a suíte completa do backend apresentou falhas em quatro arquivos, incluindo testes que exigem PostgreSQL/Redis não disponíveis nas portas padrão. Esses resultados não são declarados verdes e os arquivos dessas falhas não foram alterados por esta feature.

Para preservar os servidores locais nas portas 3000 e 3333, o E2E executou uma cópia em `output/admin-promotions-validation`, com portas 3020/3353/4119 e containers próprios em 5453/6400. As adaptações de portas, bootstrap e configuração de build ficaram somente na cópia. As capturas desktop/mobile e o relatório JSON estão nesse diretório. Os dados de teste são sintéticos. `prisma migrate status` apontou o banco local `localhost:5437/divulgador` atualizado; esta tarefa aplicou migrations somente nos bancos isolados de teste.

## Reversão

Reverter somente os arquivos e trechos desta feature, preservando as alterações locais anteriores. Os filtros e cards podem ser revertidos sem mudança de dados. Para reverter o destaque depois de usá-lo, primeiro cancelar as promoções administrativas e preencher seus prazos nulos antes de executar código antigo que pressupõe DateTime obrigatório. A remoção física da coluna/constraint exige uma migration coordenada e backup; não remover registros de auditoria nem editar o histórico de migrations manualmente. Nenhuma reversão de banco foi executada.
