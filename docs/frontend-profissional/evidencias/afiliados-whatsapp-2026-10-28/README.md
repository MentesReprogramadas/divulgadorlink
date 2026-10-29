# Central de afiliados — validação da interface

28/10/2026. Workspace isolado `C:/VSCODE/temlink-afiliados`, branch `codex/afiliados-whatsapp`, base `origin/main` 2e30da70. Frontend Next 15 / React 19 existentes. Sem dependência nova.

## Decisões

Pergunta da primeira tela: quais segmentações estão prontas e quais entregas precisam de atenção? Totais vêm da API; nenhum exemplo ou métrica de venda entra no runtime. Segmentação mostra contagem completa `_count.groups`; o recorte de grupos não vira estimativa de alcance. A lista de entregas tem busca paginada por estado para alcançar pendências antigas.

A composição usa a identidade Ondas atual, os tokens navy/turquesa, fontes Outfit/Source Sans 3, componentes de formulário, OverlayDialog, DatePicker e botões compartilhados. A direção True-black flat sorteada pela Taste fundamentou densidade/listas e métricas tipográficas; sua paleta, shell e proibição de vidro foram descartadas porque contradizem a marca e o produto aprovados. Sem gráficos decorativos ou números fictícios.

Referências registradas no Design System: Carbon Data Table fundamenta comparação/ações por linha; W3C APG fundamenta foco modal e calendário. Não foi contratado Refero nem alterada a identidade global. Em mobile, um Select substitui sete botões de área; tabelas têm rolagem local. Operação por teclado e reduced-motion preservam o comportamento dos componentes compartilhados.

## Executado

- `npm test -- --run src/features/affiliates src/components/layout/navigation-icons.test.tsx "src/app/bff/[...path]/route.test.ts"`: 36 testes passaram. Preços em centavos, autorização negada sem dados inventados, cadastro de instância com responsável, chave de idempotência preservada após erro, convite GET sem criação, rejeição de destino externo e disponibilidade stale sem bloquear POST.
- `npm run typecheck` e `npm run lint`: passaram. Build de produção executado pela raiz da tarefa, com resultado no relatório geral.
- `npx playwright test --config playwright.affiliates.config.ts`: 4 cenários passaram em desktop 1440×900 e mobile390×844. Usa servidor local3016 isolado (`TEMLINK_DEMO_BUILD=1`) e respostas BFF determinísticas, sem contas reais. Não executa o setup global de PostgreSQL/Redis.
- E2E cobre editar segmentação, ciclo Tab/Shift+Tab, Escape e devolução de foco, grupos sem overflow de página, revisão de preço com PATCH sem `segmentId` e conferência explícita de `checkedAt`, envio só após revisão com UUID, filtro/paginação até entrega incerta antiga, resolução explícita sem repetição, cancelamento de pendentes somente após confirmação e catálogo sem configuração. Desktop também verifica ausência de overflow com CSS zoom200%.
- Axe passou na região completa da central na visão geral e no `main` do convite público, nos dois tamanhos. Isso não certifica todas as variantes de componentes ou acessibilidade total.
- Playwright MCP, contexto isolado com fixtures próprias: inspeção de layout/semântica e interação real em390px; nome Natal correto, Escape devolveu foco e ausência de overflow. Sem erros de console; aviso de desenvolvimento/DevTools permanece.
- Capturas desktop/mobile de visão geral, grupos, conferência incerta, catálogo pendente e convite público geradas pelo E2E e inspecionadas visualmente. Dados determinísticos são exclusivos dos testes.

Uma execução inicial do convite público falhou porque o seletor `getByRole('alert')` também encontrou o anunciador de rota do Next. O teste foi corrigido para consultar o alerta dentro de `main`; repetição passou. Uma execução de lint encontrou referência a uma regra ESLint não instalada num comentário de suppressão; foi removida e o hook passou a usar `useCallback`.

## Integração local com persistência e entregas

`npx playwright test --config playwright.affiliates-integration.config.ts`: dois cenários adicionais passaram, desktop e mobile, usando o frontend isolado3016, API real3351, PostgreSQL descartável5638 e provedor Evolution de teste local4451. A fixture está em `backend/scripts/e2e-affiliates-server.ts` e rejeita configuração fora do banco/servidor locais previstos. O token e as credenciais de teste são exclusivos da fixture.

O navegador cria uma segmentação, recarrega e confirma persistência; entra no convite público; confere o grupo sequencial #2; cadastra uma oferta com confirmação de preço; aprova o envio e acompanha pelo histórico duas entregas `SENT` realmente processadas pelo worker. Recarregar preserva o histórico. Os grupos da fixture permanecem exatamente `123@g.us` e `456@g.us`. A navegação final para `chat.whatsapp.com` é abortada numa segunda página, sem conexão externa.

As solicitações `/bff` são encaminhadas pelo harness com `route.fetch` para HTTP real da API, e as respostas são devolvidas integralmente, sem JSON simulado. Portanto esta rodada comprova UI, autorização, CSRF, contratos, persistência, criação de grupo e entrega pelo adaptador/worker local; **não comprova o transporte BFF em execução de produção**. Esse transporte tem os testes unitários separados acima. O processo de frontend de produção local3017 não foi iniciado porque a revisão automática de aprovação bloqueou a ação; não foi tentado outro servidor. Nenhuma conta ou mensagem real foi usada.

A primeira rodada encontrou duas falhas do harness: a volta ao admin corria com o abort da navegação externa, e o seletor mobile era consultado antes da hidratação após reload. O convite passou a usar uma segunda página fechada após a captura; a troca de área aguarda a região da central. Os dois cenários passaram depois dessas correções.

## Limites e reversão

Nenhuma sessão WhatsApp, OAuth real, conta afiliada, geração live ou mensagem foi utilizada. Cadastro/conexão/QR, configuração e catálogo dependem das credenciais e permissões reais do servidor; o catálogo pendente é exibido honestamente. Não foi feita certificação de produção. Zoom foi CSS, não alteração do zoom do navegador do usuário. API/banco/concorrência são validados pelos testes do backend registrados pela raiz.

Reversão do frontend: remover `features/affiliates`, rotas `admin/afiliados` e `ofertas/entrar`, configuração/E2E próprios, o novo destino/ícone e a entrada de heading; reverter somente os deltas de BFF/testes se quiser retirar também a correção de retorno OAuth. A árvore original permanece intocada. Sem commit, push ou deploy.

## Jornada por etapas e navegação — atualização de 28/10/2026

A central segue agora a composição da visão geral de Minha Página: resumo da operação, painéis de situação e atalhos por tarefa, usando os mesmos tokens, superfícies e controles. Navegação em abas no desktop e seletor quando a largura não comporta as abas. Cada área tem endereço próprio em `/admin/afiliados`: `segmentacoes`, `grupos`, `conexoes`, `catalogo`, `ofertas` e `historico`; o botão Voltar do navegador acompanha a área selecionada.

O formulário de segmentação usa o novo `components/ui/stepper`: identidade e convite; conexões do WhatsApp; revisão. Mantém os campos ao voltar. A segunda etapa cadastra e edita conexões no próprio fluxo, oferece QR code e consulta o estado no servidor antes de avançar. Aceita várias contas, permite remover uma conta pausada anteriormente selecionada e explica que todas as contas usadas para alternância precisam participar dos grupos e ter permissão. O servidor continua responsável pela validação final. A imagem utiliza o FileUpload da casa, normalização WebP/remoção de metadados com prepareAvatar e upload autenticado que retorna uma referência privada. Nenhuma biblioteca foi adicionada.

Validação desta atualização: 28 testes focais em seis arquivos; lint e typecheck completos; seis cenários Playwright Test em desktop1440 e mobile390. Os cenários cobrem a operação existente, convite público e criação de segmentação começando sem conexões, cadastro inline, conferência da conexão, revisão final, restauração de foco e ausência de mutação prematura. Axe passou na visão geral, convite público e etapa de conexão do diálogo; o teste de nome acessível encontrou uma incompatibilidade no stepper e ela foi corrigida removendo o aria-label redundante. As capturas desktop-overview e mobile-segment-connections foram abertas e inspecionadas: abas cabem, texto e controles não cortam horizontalmente, a etapa atual se distingue e a revisão recebe foco. O teste de zoom CSS200% da lista de grupos continua aprovado.

Esta rodada de E2E usa respostas determinísticas e não conecta nem envia mensagens a contas reais. As capturas `*-segment-identity.png` e `*-segment-connections.png` registram as novas etapas. A raiz confirmou separadamente upload real de JPG/armazenamento/preview privado e geração ML pelo BFF200, além de dois E2E integrados com PostgreSQL/API e provedor simulado em portas separadas. Não foi lido QR nem entregue mensagem em conta real. Resultados finais:849 testesfrontend/219arquivos, lint/typecheck/build aprovados;807 testesbackend e88 dirigidos/PostgreSQL aprovados. Veja `docs/relatorios/2026-10-28-afiliados-jornada.md`.
