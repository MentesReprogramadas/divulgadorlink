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

## Publicação e ativação

Pendentes até concluir CI e deploy: comprovar307 e latência em produção, HEAD/OG, gravar backup cifrado da configuração Evolution na auditoria, instalar apenas GROUP_PARTICIPANTS_UPDATE na conexãoPrincipal01, concluir baseline real e verificar receptor externo com evento sintético de grupo não cadastrado, que deve ser ignorado sem alterar métricas. Não alterar participantes reais nem enviar mensagens.

## Reversão

Código anterior01e06f51 pode ser republicado pelo CI. A migração é aditiva e não exige apagar dados para voltar. Restaurar webhook anterior a partir do backup cifrado auditado; não tocar sessão ou grupos. Hashes expiram por política; não confundir expurgo com rollback de métricas agregadas.
