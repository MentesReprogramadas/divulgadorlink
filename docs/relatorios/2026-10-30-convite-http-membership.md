# Convite por HTTP e eventos de participação

## Mudança

Navegação real de navegador em REDIRECT pode receber307 no primeiro HTTP. Middleware consulta resolver read-only de convite existente. Status, ocupação e convite são consultados em paralelo; a ocupação continua ao vivo. Revalida tenant, enabled, versões de segmento/grupo/instância e capacidade. GET nunca cria, expande, sincroniza ou gira grupos. HEAD, crawlers, prefetch, suporte, SCREEN, erros e grupo cheio preservam HTML/fallback. Cookies CSRF no documento eliminam bootstrap adicional do fallback.

Encaminhamento emitido gera os contadores operacionais existentes; não comprova ingresso nem abertura nativa do aplicativo. Navegadores sem Sec-Fetch-Dest/Mode usam fallback. Não há cache longo de redirecionamento que esconda pausa ou lotação.

Evolution recebe endpoint por instanceId com HMAC dedicado derivado da chave do servidor, validado em tempo constante. Isolamento tenant/instância/grupo, parsing limitado, backpressure429 e falhas503 com Retry-After, sem logs de telefone ou corpo. Estado por identidade HMAC e grupo, separado da instância; entradas/saídas repetidas não duplicam transições. Identificador LID não é tratado como telefone.

Leitura inicial exclui membros existentes e a janela de configuração. Registra alterações suprimidas sem atribuí-las a conversões. Estado tem retenção90d e expurgo no worker; expiração exige nova leitura. Painel mostra30dias UTC, novas entradas, retornos, saídas e estado da medição. São identidades observadas após baseline; atraso de eventos e mudanças LID/JID limitam precisão absoluta.

## Validação local

Backend:915 testes aprovados,1 pulado;49 testes focados do resolver/HTTP/PG aprovados. Lint, typecheck e build aprovados. Nova migração82 aplicada em PostgreSQL descartável com pgvector. Testes específicos de participação cobrem autenticação, isolamento, limites, duplicatas concorrentes entre instâncias, retorno, replay, baseline, corrida e expurgo.

Primeiro E2E:28/30 aprovados. Os dois novos testes seguiram o307 até o WhatsApp externo; a interceptação de rota não isolou a cadeia HTTP e a espera pelo load expirou. O trace confirmou307 e destino externo200. Teste corrigido para validar o primeiro HTTP com maxRedirects0, Location exato, no-store e ausência de HTML, sem acessar provedor externo. Testes de fallback continuam no navegador real, inclusive com bundles React bloqueados. Execução consolidada final:30/30 aprovados em2minutos, incluindo novas métricas e atualização pelo teclado. Inspeção visual desktop/mobile realizada sobre capturas reais: hierarquia preservada e métricas empilhadas no celular. Evidências locais emoutput/membership-desktop.png eoutput/membership-mobile.png. Testes frontend961/961, lint, tipos e build de produção aprovados. Graphify incremental local:33 arquivos reprocessados,8676 nós/31202 relações; sem LLM ou envio externo.

## Meta e escopo não concluído

Conjunto atual usa LANDING_PAGE_VIEWS/WEBSITE, sem promoted_object. Orçamento lido éR$40/dia no conjunto, embora nome citeR$30; não alterar por inferência. Tags existentes preservadas. Proposta concreta: CTALEARN_MORE para coincidir com “Saiba mais” da imagem. Windsor recusou inicialmente porque ações de escrita estavam desativadas. O usuário habilitou e confirmou “Tá ativo”; nova execução confirmou sucesso. Criativo antigo1744545170631769 substituído por40071134125818333 no mesmo anúncio120248290448500106. Único campo pedido: call_to_action_typeLEARN_MORE. Revisão externa da Meta e comprovação de veiculação não são garantidas pela aceitação da alteração.

Sessão Meta acessível no navegador; dataset Tem Link Aqui2981954672158122. Formulário de conversão personalizada oferece apenas Site/Loja física como origem, não chat. CAPI do servidor possui token/pixel, mas consulta Graph de conversões retornou403/código200. Credenciais presentes não comprovam acesso de gestão. Campanha de tráfego não pode mudar de objetivo; uma nova campanha dependerá de conversão válida e elegível.

Nenhum telefone/identidade de participante enviado à Meta, nenhum consentimento fabricado, nenhuma conversão de ingresso simulada em dados reais. Não declarar mensuração publicitária ou campanha100% concluídas com base somente no webhook.

Após publicar o código no CI, o usuário escolheu explicitamente “Manter entrada direta, sem etapa extra”. Preservar esse caminho: nenhuma identificação/formulário adicional. Métricas de participação no painel não são atribuição individual ao anúncio. Leitura Windsor posterior confirmou CTALEARN_MORE, novo criativo40071134125818333, URL e tags idênticos e orçamento4000BRL centavos por dia.

Para alinhar a campanha à navegação direta, foi validado update_adset optimization_goalLINK_CLICKS com execution_optionsvalidate_only e depois aplicado sem esse parâmetro. Leitura posterior confirmou LINK_CLICKS, billingIMPRESSIONS, destinationWEBSITE e orçamento4000BRL. Objetivo da campanhaOUTCOME_TRAFFIC preservado; público não editado nessa ação. Primeiro snapshot após a mudança mostrou anúncioIN_PROCESS e conjunto depoisACTIVE. Revalidar estado final. Essa otimização usa cliques, não ingressos, e não promete melhoria de conversão. O307 não executa nosso HTML/Pixel; não é correto afirmar LPVzero, pois a cobertura/modelagem do navegador interno não foi confirmada.

## Publicação e ativação

Pendentes até concluir CI e deploy: comprovar307 e latência em produção, HEAD/OG, gravar backup cifrado da configuração Evolution na auditoria, instalar apenas GROUP_PARTICIPANTS_UPDATE na conexãoPrincipal01, concluir baseline real e verificar receptor externo com evento sintético de grupo não cadastrado, que deve ser ignorado sem alterar métricas. Não alterar participantes reais nem enviar mensagens.

## Reversão

Código anterior01e06f51 pode ser republicado pelo CI. A migração é aditiva e não exige apagar dados para voltar. Restaurar webhook anterior a partir do backup cifrado auditado; não tocar sessão ou grupos. Hashes expiram por política; não confundir expurgo com rollback de métricas agregadas.

## Correção do transporte entre middleware e API

Sondagem HTTP real do fetch Node mostrou Sec-Fetch-Modenavigate reescrito paracors. A fixture anterior não conferia esses metadados, portanto o307 isolado não comprovava o gate na API real. O middleware agora preserva o modo original já validado emx-affiliate-fetch-mode; cabeçalho fornecido pelo cliente não substitui a validação de navegação original. A API aceita esse marcador ou o header de navegação direto, mantendo o resolver read-only e as exclusões. PostgreSQL/HTTP agora cobre transporte real fetch, cors+marcador e cors sem marcador. Fixture E2E exige o marcador e Sec-Fetch-Destdocument para que o caminho completo seja exercitado. Nova rodada CI necessária; não declarar fast path validado em produção antes dela.

O teste de rede também comprovou Host substituído pelo endereço do upstream. Corrigido com x-affiliate-tenant-host construído a partir do host já validado no middleware, aceito apenas no novo resolver público read-only. Não altera tenant de rotas administrativas nem autorização. Teste PostgreSQL usa HTTP real em porta aleatória e fetch nativo, resolvendo tenant cadastrado apesar do Host127.0.0.1; sem marcador de navegação mantém fallback. Fixture E2E exige ambos metadados encaminhados.

Confirmação adicional em DockerLinux/Node22.23.4: fetch enviou Host127.0.0.1 e Sec-Fetch-Modecors, preservando o marcador próprio. Depois de ambos ajustes:50 testes backend afetados,20 middleware,961 frontend e30 E2E desktop/mobile aprovados; lint, tipos e builds aprovados. Graphify final8677 nós/31204 relações. A rodada intermediária40989778934 falhou exatamente no caso de Host ainda não corrigido (404 em vez deurlnull); não foi publicada. A rodada inicial40988309298 passou25/25, mas foi superada antes do deploy. Versão final7a2b45173fe958a661e5241feabd07f420e6ce45 emCI40989997325, sem bypass.

Snapshot de anúncios posterior: anúncio/conjunto/campanha efetivamenteACTIVE, CTALEARN_MORE, LINK_CLICKS eR$40/dia confirmados. Nenhuma conversão de ingresso ou compartilhamento de telefone ativado na Meta.

## Produção 7a2b4517 e validação real

CI40989997325 aprovado25/25. Ponte/API/worker/web no mesmo7a2b4517; processos saudáveis (worker sem probeHTTP). Cinco respostas HTTP307 atéLocation validado:1409/1374/799/876/817ms, mediana876ms, primeira1409ms. Medição viaHTTPS bruto preserva os headers de navegação; não segue WhatsApp, não entra e não envia mensagens. É tempo até o encaminhamento HTTP, não abertura nativa; os marcos diferem do benchmark antigo até navegação interceptada, portanto não declarar percentual rigoroso de ganho. Avatar/OG200600×600JPEG74995bytes eHEAD200 preservados. Redis real:uma chave de convite ativa comTTL24469ms, scan completo; valores não exibidos.

Webhook GROUP_PARTICIPANTS_UPDATE instalado e relido habilitado emPrincipal01, byEventsfalse, secret derivado por instância. Backup anterior cifrado em auditoria. Baseline inicial30/10/2026 02:36:35.707UTC (29/10 23:36BRT), quatro participantes existentes, nenhum contado como novo. Probe externo de grupo não cadastrado ignorado sem alterar métricas. Recebimento real às02:38:57UTC, mas evento foi classificado stale; investigação abaixo impede declarar contador validado antes de corrigir. Login real autorizado com a conta indicada confirmou painel e métricas; sessão isolada encerrada e arquivo temporário de credencial removido. Evidência output/membership-production-admin.png. A sessão pessoal do Brave não foi alterada.

## Erro de relógio confirmado na Evolution 2.3.7

Código oficial [ChannelStartupService.sendDataWebhook](https://github.com/EvolutionAPI/evolution-api/blob/2.3.7/src/api/services/channel.service.ts#L413) subtrai getTimezoneOffset e depois usa toISOString: horário local é rotulado comoUTC. Probe somente leitura no container realapi-mzvu8ebckvas5k90no6gsaaa confirmou TZAmerica/Sao_Paulo, offset180, UTC02:52 e campo emitido23:52Z. Isso explica descarte como anterior ao baseline. Não alterar TZ global nem reiniciar serviço compartilhado ou outras instâncias.

Correção escopada: headerx-evolution-clock-offset-minutes180, avaliado somente após autenticação da instância; normaliza o campoZ desse provedor em+180minutos. Default0 preserva outros produtores; rejeita offset inválido e aplicação sobre ISO com offset explícito, evitando dupla correção. Não inferir pelo horário de chegada: retries antigos continuam antigos. TDD mostrou3 falhas antes e corrigiu;28 regressões e4PostgreSQL aprovados, lint/tipos/build backend aprovados. Nenhuma migração nova. Evento descartado não foi reconstruído nem chamado de ingresso.

Medição marcadaBASELINING/PROVIDER_CLOCK_MISMATCH por transação auditada até publicar correção; histórico e participantes preservados. Após novoCI/deploy, configurar o header apenas nesta conexão e fazer nova leitura inicial para estabelecer uma janela confiável. O intervalo da falha deve ser excluído, sem preencher com estimativas.
