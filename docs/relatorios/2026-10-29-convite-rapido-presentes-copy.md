# Convite, presentes e mensagens — 29/10/2026

## Alterações

- Convite público recebe os dados na renderização inicial e reaproveita a leitura usada pelos metadados. Elimina uma consulta duplicada no navegador. O bootstrap CSRF permanece único.
- Redis opcional guarda sessão aberta por 5 segundos e convite validado por 30 segundos. Chaves isolam tenant, instância, revisão, servidor e credencial sem expor os valores. Ocupação e autorização continuam ao vivo; criação de grupo exige sessão fresca. Redis indisponível retorna ao provedor.
- Intenção geral de Natal inclui presentes e decoração. Sementes recomendadas: `Presentes de Natal` e `Decoração de Natal`. Plano determinístico abrange roupas, calçados, brinquedos, beleza, casa, eletrônicos e decoração natalina; até 24 termos com complemento da IA. Campanhas específicas preservam seu escopo. A lista continua misturada, deduplicada e paginada.
- Coleta faz uma consulta por execução, com aquecimento a cada 30 segundos enquanto faltam fontes e atualização normal a cada 15 minutos. Não promete pesquisar o catálogo inteiro nem inventar desconto ou histórico. Preço, histórico e reputação mantêm as regras existentes.
- A IA recebe foto oficial do CDN do Mercado Livre e título original. Gera chamada natural e identificação objetiva em linhas separadas. Medidas e fatos precisam constar do título; a foto não prova características. Sem urgência, escassez ou superlativos inventados.
- Prévia e regeneração incluem a chamada no token assinado. Envio valida e persiste a mensagem exata aprovada. Nada é enviado automaticamente por esta mudança.

## Evidências anteriores à publicação

- Backend: 903 testes aprovados, um teste Redis dedicado omitido nessa execução e executado separadamente. Redis real + unidade: 6 aprovados. PostgreSQL próprio: 65 aprovados, incluindo imagens. Teste de copy adicional: 11 aprovados. Lint e build aprovados; tipos repetidos após corrigir fixture com catalogId inválido.
- Frontend: suíte completa anterior 932 aprovados; testes afetados finais 18 aprovados; 24 E2E em desktop/mobile aprovados. SEO: 22 E2E aprovados; regeneração com nova chamada: mais 2 E2E aprovados. Lint, tipos e build dos dois pacotes aprovados.
- OpenAI real: três produtos existentes com foto; três respostas OPENAI aceitas, 1,47–2,75 segundos. Exemplo: “Uma cascata de LED amarelo para sua decoração de Natal ✨”. Nenhuma mensagem enviada; credenciais permaneceram no container da API.
- Benchmark anterior: navegação direta ao convite em três contextos móveis novos, com destino WhatsApp interceptado: 3445 / 3212 / 3236 ms (mediana 3236 ms). Cabeçalho e user agent de diagnóstico excluem métricas. Isso mede o encaminhamento no navegador, não o lançamento nativo no celular.
- Revisão independente estática não encontrou novos bloqueios após exigir sessão fresca para expansão e remover preload concorrente de CSRF.

## Pesquisa do funil

[Relatos de anunciantes](https://www.reddit.com/r/whatsapp/comments/1oi375y/whatsapp_group_link_not_working/) descrevem convites abrindo loja de aplicativos apesar de WhatsApp instalado. São relatos, não prova da causa das 43 visitas. [Chrome documenta](https://developer.chrome.com/docs/android/intents) restrições a abrir aplicativos via intent sem gesto do usuário; o documento não comprova falha específica do nosso link HTTPS. [Branch documenta](https://help.branch.io/developer-hub/ios-universal-links) limitações de Universal Links em navegadores embutidos no iOS.

Grupo real consultado por inviteInfo: nome correto, 4 membros, aprovação de novos membros desligada. Não foi constatado bloqueio por aprovação. Meta informa 43 visualizações da página e 99 cliques de saída no recorte disponível, com otimização para LANDING_PAGE_VIEWS, não ingresso confirmado. As 43 visualizações antecedem o retorno do convite ao modo REDIRECT às 19:03 BRT. Contadores de ferramentas diferentes não representam necessariamente pessoas únicas nem a mesma etapa. Dados e limites em `2026-10-29-meta-natal-funil.md`.

O post orgânico do Instagram não contém o CTA do anúncio. Prévia compartilhada da Meta exigiu login; Biblioteca de Anúncios retornou 403 no navegador isolado. Não há URL nativa com CTA verificada, nem confirmação em aparelho físico. Nenhum anúncio, orçamento ou campanha foi alterado.

## Limites e reversão

Convite revogado externamente pode permanecer em cache por até 30 segundos. A consulta de ocupação continua dependendo do WhatsApp, por isso não existe garantia de latência instantânea. O navegador embutido e a decisão de abrir o aplicativo pertencem ao dispositivo. A descoberta amplia a amostra, não garante estoque, comissão ou desconto para qualquer produto.

Reverter código pelo CI para 3e26eb8e e restaurar sementes anteriores por operação auditada, preservando métricas, ofertas e histórico. Não há migração de schema. Chaves de cache expiram sozinhas.

## Correção da fixture no CI

O CI inicial a16dde7e bloqueou a publicação porque uma comparação literal do E2E ainda esperava a prévia sem headline. A fixture havia sido ampliada depois da primeira execução completa. A expectativa foi atualizada para conferir as duas linhas integralmente, sem remover a assertiva. Reexecução local completa final: 24/24 E2E desktop/mobile aprovados em 2,6 minutos. Nenhum código de produto mudou nessa correção.

## Primeira publicação e medição real

Produção c0675b568b3e9df0d345ec71bd06b8d198f86779: CI40972314046 aprovado25/25; ponte/API/worker/web no mesmo SHA. Natal foi configurada por transação auditada na conta administrativa indicada, configVersion4, sementes Presentes de Natal + Decoração de Natal. Plano real24 termos. Nenhuma alteração em grupos, conexões ou sessão do Mercado Livre.

Primeira medição depois de SSR/cache:3312/2981/3164ms, mediana3164ms, versus3236ms anteriores. Ganho de apenas2,2%; não atende à expectativa de quase instantâneo. Nenhum GET público duplicado no navegador nas3 execuções. Join no navegador774/565/558ms. Avatar/OG200, JPEG600×600/74995bytes preservado. Destino interceptado, sem ingresso nem mensagem.

Trace: respostaHTML859ms; bundles começam1635ms; bootstrapCSRF só inicia2197ms, termina2475ms; join2476→3318ms. A espera para hidratar a aplicação domina o atraso. Melhoria adicional: script com nonce no head somente em REDIRECT+disponível, sem suporte/host pessoal. Inicia os mesmos POSTs antes da hidratação; compartilha a única promessa CSRF com o cliente; React adota resultado/falha e mantém retry. Não cria grupos em GET no servidor, não remove proteção CSRF nem cabeçalho compartilhado.

Cobertura comercial observada: primeiro lote Camiseta masculina trouxe20 catálogos sem anúncios (NO_LISTINGS, failed0). Tênis feminino trouxe1 anúncio de Olympikus. O recurso products/search lista produtos aptos a publicação, não garante anúncios ativos: [documentação oficial](https://developers.mercadolivre.com.br/buscador-de-produtos). Não há filtro documentado de somente disponíveis identificado nesse recurso. O sistema deve distinguir catálogo encontrado de anúncio utilizável; ampliação de termos não representa busca exaustiva do Mercado Livre.

## Handoff antecipado: validação adicional

- 955 testes frontend aprovados, lint e tipos frontend/e2e aprovados.37 testes afetados cobrem bootstrap compartilhado nos dois sentidos, StrictMode, destino inválido, ausência de cookies, suporte, saída/retorno à rota e retry manual. Helper servidor cobre nonce, SCREEN, indisponibilidade, suporte e host pessoal.
- 28 E2E aprovados em desktop/mobile contra build de produção. Quatro execuções cobrem convite com bundles React abortados e erro antecipado adotado pelo React, seguido de retry manual. Nenhuma duplicação de csrf/visit/join automático; não se retirou assertiva.
- O executor afiliados agora usa build .next-e2e, lease comum, readiness /health e fixture HTTP loopback só para metadados. Rejeita todos os POSTs; navegador intercepta mutações. Não depende de credenciais, banco ou provedor reais. Portas padrão3016/4458 precisam estar livres; validação local usou3018/4458, sem encerrar o painel existente3016.
- Duas tentativas do executor SEO local falharam antes de subir API/worker com Windows DLL_INIT_FAILED3221225794; não alcançaram os testes. Suíte SEO original foi preservada integralmente. O novo E2E de handoff foi isolado do backend nativo para comprovar o build real. SEO22 segue como gate no CI completo; não declarar esse novo lote SEO local aprovado.
- Cobertura real adicional: Brinquedo educativo retornou10 anúncios, Kit perfume10 e Tênis feminino1. Camisetas primeiro lote0 anúncios, sem falha técnica nem descarte por preço. A coleta prossegue automaticamente.

## Encerramento do executor Linux

O launcher introduziu um processo Next detached no Linux. Playwright encerra por SIGKILL o grupo que iniciou; o Next em outro grupo sobrevive e mantém stdout aberto. A rodada40978037752 permaneceu com22 verificações aprovadas e duas suítes afiliados em andamento, sem disponibilizar log final. A credencial Actions não permite cancelamento; o usuário também informou não conseguir cancelar.

Reprodução local em Docker Node22.23.4/Linux com o launcher real e substituto HTTP mínimo do Next: variante detached sobreviveu ao encerramento do grupo e reteve stdout; variante corrigida (detached:false) fechou stdout e porta tanto em SIGKILL quanto SIGTERM. Corrigido shutdown para child.kill(SIGTERM) e gracefulShutdown10s no Playwright, preservando todos os testes. Reexecução direcionada no build de produção:4/4 E2E aprovados em41,9s. Nenhum código de produto mudou nessa correção de processo. Referências: [Node detached](https://nodejs.org/api/child_process.html#optionsdetached), [Playwright webServer](https://playwright.dev/docs/api/class-testconfig#test-config-web-server).

As três credenciais GitHub disponíveis foram verificadas apenas quanto à permissão no repositório da tarefa; todas permitem consulta, sem push/admin via API. Nenhuma conta padrão foi alterada. Publicação por SSH continua autorizada; cancelamento por Actions API não está disponível. O gate de CI foi preservado.

## Publicação final e prova operacional

CI40980845679 concluído com sucesso25/25. Ponte/API/worker/web confirmados em01e06f51a00a161632ab2dc9348c671fa642662e; ponte/API/web running:healthy e worker running:unknown (processo ativo sem probe HTTP). Nenhum bypass de CI.

Primeira sondagem durante a conclusão do rollout expirou esperando o destino; a causa não foi comprovada. Após conclusão, sondagem com rastreamento confirmou HTML200, CSRF200, visit200 e join200. Três medições finais em contextos móveis novos:2790/2729/2705ms, mediana2729ms, versus3236ms inicial (redução15,7%). A espera final usa commit da navegação, com destino WhatsApp interceptado; a medição inicial usava load, portanto os marcos não são rigorosamente idênticos. Nenhum GET público duplicado; exatamente um CSRF, um visit e um join em cada execução final. Não houve ingresso nem envio de mensagem. Esses dados não comprovam abertura do aplicativo dentro do Instagram real, nem aumento de conversão. Ainda não é instantâneo.

Prova Redis após nova navegação: SCAN completo,682 chaves totais, uma chave ativa do namespace de convite comTTL18453ms. Sondagens anteriores fora da janela de validade não encontraram chaves; não constituíam falha comprovada de cache. Nenhum valor ou chave sensível foi exibido. Avatar/metadados preservados:HTTP200/JPEG600×600/74995bytes, imagemHEAD200, robotsnoindex/nofollow.

Descoberta real no acompanhamento:24 termos,24 fontes coletadas,122 IDs distintos no cache bruto, estadoREADY e erro nulo. Isso não significa122 ofertas aprovadas ou comissionáveis. Grupo/instâncias/sessão Mercado Livre preservados; nenhuma oferta de teste enviada. Pesquisa adicional de atribuição e abandono está no relatório2026-10-29-funil-natal-conversoes-meta.md. Não foram ativados webhook de participantes, CAPI novo ou alterações da campanha.
