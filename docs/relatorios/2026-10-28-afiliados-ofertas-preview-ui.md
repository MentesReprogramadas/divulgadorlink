# Afiliados: produtos avaliados e revisão única — UI, 28/10/2026

Escopo executado no workspace `C:/VSCODE/temlink-afiliados`, preservando alterações anteriores. Sem branch, commit, push, deploy, biblioteca nova ou mensagens reais.

## Comportamento

- Descoberta apresenta Selecionados, A revisar e Descartados; cada produto explica critérios, reputação original, dias de observação e insuficiência de histórico. Desconto informado e mediana histórica têm rótulos diferentes.
- Navegação por termo e página da fonte solicita coleta da página; forçar atualização prioriza termo/página visíveis. Contador e barra usam `nextRunAt`/intervalo do servidor. Alterar configuração reseta a navegação.
- Produto abre modal imediatamente com carregamento, foto disponível, mensagem exata do servidor, preço e destinos. Enviar confirma com token; cancelar não aprova. Botão bloqueia duplo clique; progresso consulta contagens reais, sem repetir resultados incertos. Sem grupo ativo, enviar fica desabilitado.
- Descartar persiste a decisão; Restaurar libera nova avaliação. Produto descartado pelo operador não abre prévia até restaurar. Ausência de foto/preço anterior tem fallback explícito.
- Envios em cards paginados por cursor, com mensagem e contagens; consultas Atualizar recarregam contagens mesmo sem aumentar o número de envios. Auditoria, confirmação de resultado incerto e cancelamento anteriores continuam nos detalhes.
- Cards de histórico usam imagem imutável do envio e preço opcional da fotografia de dados. Legado sem fotografia não inventa preço atual de rascunho: orienta consultar a mensagem enviada.
- Etapa principal da segmentação passou de cadastro/revisão separados para abrir e enviar o produto. Ferramentas manuais e registros antigos seguem recolhidos como complemento.

## Verificações executadas

- Vitest área affiliates: 75 testes passaram na rodada completa; dois testes adicionais (card descartado e legado sem preço) passaram nas rodadas dirigidas, total atual 77 testes de área.
- ESLint completo `src/features/affiliates`: passou antes do ajuste final de legado. TypeScript app e E2E passaram; TypeScript do app repetido após contrato legado.
- Playwright Test `playwright.affiliates.config.ts`: 12/12 passaram em desktop1440×900 e mobile390×844, fixtures isoladas, nenhum provedor real. Inclui prévia, cancelamento/Escape e retorno de foco, histórico e ações legadas, ausência de overflow, paginação da fonte, contador, forçar atualização, descarte/restauração e verificações axe nas jornadas existentes.
- Playwright MCP: inspeção separada com fixtures, desktop e mobile, sem duplicar controle da página de testes. Fotos ausentes verificadas por fallback; modal e dados conferidos visualmente. Mobile recebeu foto de até200px e rodapé de ações fixo dentro do modal; Enviar permaneceu visível no viewport e sem overflow horizontal.
- Screenshots Test e MCP em `docs/frontend-profissional/evidencias/afiliados-whatsapp-2026-10-28/`. Capturas MCP incluem apenas fixtures; não comprovam preços/produtos reais.

## Limites e reversão

Build/lint/testes globais e integração com API real são coordenados pelo agente principal; este relatório não afirma que foram executados nesta subtarefa. Nenhum envio de WhatsApp real foi realizado. Histórico financeiro/provedor, autenticação/tenant e persistência dependem das verificações do backend.

Reversão: restaurar apenas os arquivos da área alterados nesta etapa e os testes correspondentes, preservando o restante da árvore suja; não executar reset amplo. Novos arquivos principais: `product-preview-dialog.tsx`, `broadcast-history.tsx` e respectivos testes.

## Complemento: página fria e integração HTTP real isolada

- Página visível sem cache (`READY`, `checkedAt` existente, `pageStatus=NOT_COLLECTED`) agora solicita prioridade uma vez por termo/página e consulta a cada3s até receber dados. Não apresenta cache vazio como resultado definitivo. Navegação explícita registra a solicitação para evitar duplicá-la; alteração de configuração limpa o registro.
- Horário já vencido apresenta “Aguardando próxima coleta”, sem prometer início imediato. Guia inicial descreve coleta automática e revisão/envio no mesmo modal.
- Vitest DiscoveryPanel:17/17 passaram após esses ajustes. TypeScript app e E2E passaram nas rodadas dirigidas; ESLint discovery/overview passou antes do último rótulo trivial de espera.
- Integração HTTP real em API3352 + provedor loopback4453 + frontend3016: `npx playwright test --config playwright.affiliates-integration.config.ts`,4/4 passaram (desktop e mobile,46,7s). Sem stub de respostas da API, só proxy da rota BFF e fixture de imagem. Backend usa banco descartável identificado; nenhum provedor externo.
- Integração confirma: criação e persistência da segmentação, convite/expansão existente, grupo próprio do cenário, coleta automática, imagem, prévia com link gerado, cancelamento sem persistir oferta/envio, confirmação única sem cadastro manual, processamento sem timer de envio da fixture em até15s, isolamento do destino e mensagem persistida idêntica no histórico após reload.

Integração repetida com asserção adicional de início automático:4/4 passaram em45,1s. Em ambas jornadas, antes de abrir Ofertas, a API da segmentação nova já retorna descoberta habilitada, observação (`checkedAt`), termos expandidos e produtos, sem POST de atualização/página durante a espera. Rótulo do seletor de termos separado do controle com `htmlFor`/`id`, permitindo nome acessível exato. Discovery17/17, TypeScript app/E2E e ESLint discovery/overview passaram após esses ajustes.
