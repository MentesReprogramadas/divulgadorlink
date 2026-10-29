# Jornada guiada de Afiliados e WhatsApp

Implementação incremental na worktree `C:/VSCODE/temlink-afiliados`, sem commits, push ou deploy.

## Fluxo

A navegação principal passa a quatro abas: Início, Segmentações, WhatsApp e Envios. Ferramentas mantém as URLs globais anteriores disponíveis. Início apresenta Como começar, Continue de onde parou e Suas segmentações dentro de um card.

Criar segmentação abre automaticamente seu endereço `/admin/afiliados/segmentacoes/:id`. O espaço contextual acompanha WhatsApp → Grupo → Ofertas → Revisão e envio e mantém Grupos, Ofertas e Envios em abas. Criar o primeiro grupo exige confirmação explícita; não acontece ao salvar a segmentação ou carregar uma página. Grupos pausados e provisionamentos incertos recebem ações específicas.

Ofertas apresenta a busca de produtos no próprio contexto e os rascunhos preparados abaixo. A segmentação permanece fixa ao gerar o link e salvar. O próximo rascunho ainda não distribuído tem prioridade sobre envios históricos. Aprovar o envio continua exigindo a revisão e confirmação existentes. Atualizar envios somente consulta os resultados.

Contas WhatsApp consultam o estado real, exibem uma ação principal contextual e agrupam manutenção em Mais opções. Versões por conta descartam respostas antigas que poderiam mostrar Conectar após a conta estar conectada. QR e cancelamento mantêm suas proteções.

O catálogo usa um carregamento inicial próprio, sem apresentar credenciais ausentes antes da resposta. Dados técnicos ficam recolhidos. Busca e botão alinham suas bases; a resposta distingue os anúncios disponíveis da amostra de produtos consultados, sem prometer que a amostra cobre todo o Mercado Livre.

## Verificações executadas

- Frontend completo: 867 testes em 222 arquivos aprovados; após o último ajuste, 45 testes focados em 7 arquivos aprovados.
- Lint e typecheck aprovados.
- Playwright UI: 6 casos desktop/mobile aprovados, incluindo criação guiada, QR, primeiro grupo explícito, catálogo, oferta com segmentação fixa e revisão de envio. Axe nos estados cobertos pelos casos.
- Playwright integrado: 4 casos desktop/mobile aprovados em 42,3s contra API real de regressão e provedores simulados, incluindo convite com expansão, geração automática e entrega limitada à segmentação escolhida.
- Após reiniciar bridge/API/fixture com o novo catálogo em lote: os mesmos 4 E2E integrados passaram novamente em 54,9s, sem alterações adicionais no frontend ou testes. Log local: `output/local-affiliates/guided-integration-batch.log`.
- Build de produção separado do dev3016 em `.next`, sem sobrescrever `.next-ondas-demo`.

O teste integrado usa somente API3352, provider4453 e banco de regressão. Não foram criados grupos, contas nem mensagens reais por esta implementação. A inspeção real do painel foi feita pelo agente responsável, preservando os dados do operador. Não há validação de entrega real ao WhatsApp nesta rodada.

Inspeção adicional no painel local: Natal abriu diretamente seu catálogo na aba Ofertas; uma busca real consultou 20 produtos em 10,9s e retornou um anúncio, sem overflow horizontal em 1440px. A captura está em `output/local-affiliates/guided/catalog-real-desktop.png`. Na origem, 19 consultas de vendedores retornaram HTTP404; isso significa ausência de anúncio na resposta consultada, sem comprovar ausência de estoque. A busca geral de anúncios retornou403; a correção não contorna essa restrição. Catálogo e ponte tiveram 70 testes direcionados, lint, typecheck e build aprovados; após corrigir encoding, mais31 testes direcionados passaram.

## Arquivos e reversão

A composição está em `affiliates-screen.tsx`; apresentação do espaço contextual em `segment-workspace.tsx`; formulário de vinculação em `link-segment-group-form.tsx`; catálogo em `catalog-panel.tsx`. Rotas contextual e base estática ficam em `app/admin/afiliados/segmentacoes`. Testes UI e integrados ficam em `frontend/e2e/affiliates-*`.

Reverter seletivamente esta fatia após revisar alterações locais; não usar reset global. Esta etapa de UX não introduziu migrations nem dependências.


## Regressão após conta e sessão do Mercado Livre

Em uma nova rodada com backend/fixture reiniciados, os 8 casos UI foram percorridos: 7 passaram inicialmente; o caso legado desktop encontrou somente o skeleton após cinco segundos de carregamento com build/suíte concorrentes. O timeout inicial foi ajustado para 30 segundos e somente esse caso foi repetido, aprovado em 5,8s. Os novos casos de sessão, limpeza de segredos, retorno de foco, alinhamento da busca e preparação por URL passaram em desktop e mobile.

Os 4 E2E integrados passaram novamente em 41,7s após corrigir exclusivamente o matcher de URL do gerador simulado: o backend passa a enviar o endereço exato normalizado do anúncio. A primeira tentativa mostrou dois erros do fixture, sem mudança de produção para acomodar o teste. Logs: `guided-integration-ml-session-retry.log` e `guided-ui-ml-session-retry.log`, em `output/local-affiliates`.
