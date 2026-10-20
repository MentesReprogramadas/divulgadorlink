# Execução F15 — Páginas por campanha

19/10/2026. Em preparação S0, sequência autorizada após F05; parar somente após F21. Sem Git/deploy novos.

## D17 — Contrato e alternativas

- Campanha parte de uma publicação própria disponível no histórico F19; copia apresentação/aparência aprovadas e permite selecionar seus links. Nome da campanha é privado, explicitamente rotulado; não é um novo título público livre. Grupo, texto e destino não podem ser inventados pelo payload de seleção. Alternativa de outro editor público completo rejeitada por duplicar F09 e exigir um fluxo novo de revisão fora do contrato inicial de seleção.
- Reutilizar profileInput, profileModerationChanges e validateProfile com o snapshot de origem aprovado: uma seleção sem conteúdo novo reaproveita a aprovação; transporte, bloqueios e referências de catálogo continuam revalidados. Não injetar verdict falso ou conceder humanApproved para contornar moderação.
- URLs próprias são copiadas; referências de catálogo continuam por ID, com elegibilidade atual do backend. Canais F37 viram links individuais do snapshot, sem tokens/handles nem novos vínculos internos. Mudanças futuras de destino no perfil não sobrescrevem a campanha. Alterações de nome/seleção da campanha não alteram o perfil.
- Endereço /p/:slug/c/:campaignSlug, único por página; slug publicado só muda após arquivar. Arquivamento invalida acesso e tokens imediatamente. Perfil principal fora do ar ou proprietário suspenso também impede leitura pública. Excluir remove campanha; arquivar mantém rascunho próprio.
- Fotos antigas não são preservadas: renderizar apenas a foto ainda disponível na publicação principal; não recuperar/duplicar imagens removidas. Apresentação pública e prévia usam ProfileView e marca existentes.
- Métricas reutilizam F31: mesma capacidade paga e adesão do proprietário, consentimento separado do visitante, min 10 sessões diárias e 180 dias. campaignId estável em eventos, token com propósito distinto, consultas isoladas de métricas principais. Não reutilizar campaign-touch de aquisição como identidade de campanha e não duplicar CTR.
- F20 não concede exportação/cobrança/gestão de equipe por consequência da edição; matriz específica será registrada na próxima entrega. Sem nova cobrança, preço ou promessa de audiência.

## Arquitetura prevista

CampaignPage com snapshot próprio, seleção e publicação/versionamento independente, FK composta para perfil/tenant/dono. Extensão restrita dos eventos F31 com campaignId opcional e filtro NULL para relatórios principais. Nenhum backfill de conteúdo/eventos antigos. APIs owner-only derivadas da sessão, parser estrito e CAS. UI de listagem primeiro; criar/editar em modal e renderer existente na prévia.

S1 e implementação ainda não iniciadas; decisões acima não representam evidência de testes.

## S1–S5 em andamento

RED real: domínio (cópia/seleção ausentes) e dois componentes falharam pelo comportamento ausente. Implementados seis unitários de domínio/tokens, três componentes de campanhas, observer compartilhado com endpoint por campaignId e paginação compacta tipada que preserva o comportamento padrão dos consumidores anteriores. A seleção usa duas linhas por página e busca para evitar um modal longo, sem renderizar centenas de botões de paginação.

Primeiro checkpoint PG: dez próprios e nove de regressão F31 (a rodada inicial conjunta tinha sete próprios + nove F31). Casos verificam CAS, IDOR/ADMIN, CSRF, verificação/suspensão, publicação sem inventar novo verdict de IA, destinos copiados/referências vivas, arquivo, deduplicação e métricas com período/contexto separados. Resultados finais e E2E ainda pendentes.

Sem alteração comercial: campanhas usam apresentação existente; métricas continuam dependendo de profile.analytics e da preferência explícita F31. A tela de métricas de campanha reutiliza InteractionScreen/InteractionResults; configuração de medição é a da página, identificada como tal e acessível por link separado, sem ativação implícita.

Risco de reversão a conferir: um leitor F31 anterior não filtra campaignId NULL. Rollout precisa impedir tráfego de campanhas em nós antigos; antes de voltar ao leitor anterior, arquivar campanhas e mover seus eventos para armazenamento de quarentena reversível, preservando contagens principais e dados. Não fazer downgrade destrutivo nem chamar soma antiga de relatório validado. Ensaio SQL dessa preservação ainda será executado em fixture descartável.

## Reconciliações adicionais de D17

- A cópia mantém restrição 18+ histórica dos canais, inclusive quando a classificação não pode mais ser consultada; nesse caso a cópia é conservadoramente restrita. Catálogo ainda usa classificação/elegibilidade atuais. A restrição não depende de remover metadata do renderer e não pode ser reduzida pelo payload de seleção.
- Busca interna F18 não faz parte do renderer inicial de campanhas: searchEnabled é desativado na cópia, mantendo cores/tipografia/botões da origem. Evita prometer um controle não integrado ao contexto de campanha; não afeta a página principal.
- Renomear o identificador privado da campanha não cria nova publicação nem zera a versão observada das métricas. Alterar seleção produz alterações pendentes e a ação Publicar alterações; a publicação anterior fica ativa até confirmar.
- O primeiro E2E foi bloqueado por lint de snapshot anterior; o segundo foi interrompido após identificar o host de fixture ausente na allowlist local de IA (produção permanece protegida); o seguinte falhou por asserção de campo da resposta: o contrato oficial usa publishedRevisionId, corrigido. A rodada seguinte passou em sete jornadas e falhou somente ao selecionar um filtro mobile recolhido; o teste agora expande Ver mais como os demais consumidores. Nada disso é registrado como aprovação final.

A inspeção nativa detectou falta da classe personalPage no main público da campanha: a prévia ocupava a tela, mas o público recebia o limite genérico de largura. Corrigido reutilizando o mesmo CSS de F09; E2E agora confere x=0/largura do viewport em ambas as dimensões. A regressão F31 de purge recusou o run ID roadmap-f15 por sua proteção /^f[0-9]+-/; próxima rodada usa f15-final, mantendo a proteção intacta.

Ensaio de compatibilidade em f05_upgrade: perfil e evento F31 legados criados antes da migration F15, preservados após upgrade; campaignId antigo permanece NULL e reader SQL anterior continua legível. PG02 ensaia a quarentena reversível de fatos de campanha, com contagem do leitor antigo antes/depois e restauração; não é prova de deploy ou execução completa do binário antigo. Para rollback operacional: interromper ingestão de campanhas, conservar backup de metadata antes de arquivar publicações e mover fatos para quarentena privada auditada; nunca apagar os fatos para esconder mistura de métricas. Restaurar somente sob código novo e respeitando exclusões/revogações posteriores do proprietário, sem republicação automática. CI e liberação continuam pendentes.


## Fechamento local de S0–S6 — 19/10/2026

Implementação local validada. Seis testes de domínio F15, três componentes e regressões do observer/paginação. Backend completo: 562 testes; frontend completo: 361. Lint/typecheck e build backend aprovados; build Next de produção aprovado no harness. PostgreSQL real: 45 testes em quatro arquivos (13 F15 + regressões F19/F31/F37), incluindo rollback reversível PG02, composição 18+, falha de persistência, CAS e isolamento. Playwright final próprio: 9/9 (setup + quatro jornadas desktop/mobile), log e2e-width; regressão F31: oito jornadas aprovadas na rodada e2e-verified (o caso próprio restante daquela rodada foi apenas largura considerando scrollbar-gutter, corrigido para largura do body; não removida a asserção de tela cheia).

Inspeção nativa desktop/mobile confirma renderer público de tela cheia, marca pequena, prévia sticky, listagem, seleção compacta, métricas, vazio, erro, zoom 320px e confirmação. Capturas em docs/frontend-profissional/evidencias/f15-2026-10-19. Axe nas páginas exercitadas sem violações nos conjuntos executados; não é alegação de acessibilidade total. Barras de rolagem reservadas pelo fundamento global descontadas no oráculo de largura.

Migration aditiva validada em banco descartável com dados antigos; sem perda de perfil/fatos anteriores, eventos antigos campaignId NULL. Banco pessoal ainda não atualizado neste checkpoint; atualização controlada será registrada após validação do lote. Tokens, consentimento, capacidade paga e moderação não foram contornados. Nenhum commit, push, deploy, envio real ou alteração em main. S7 em revisão: CI remota/liberação não executadas. Reversão operacional exige a quarentena descrita acima, não apagar fatos nem executar reader antigo sobre eventos de campanha ativos.

Encerramento do lote F21: banco pessoal atualizado preservando 17 usuários, 1 página e 640 links, 53 migrations; nenhuma campanha criada automaticamente. Registros/evidências finais em [F21](execucao-f21.md), incluindo regressão PG/E2E posterior e limpeza de containers próprios.


## Refinamento solicitado após F21 — 19/10/2026

Implementação e decisões: [refinamento F05/F15/F20/F21/F38](refinamento-f05-f15-f20-f21-f38.md). Inclui importação JSON confirmada para rascunho, resumos com frequência no modal e desligamento direto, sidebar por contexto, prévia de campanha preservando o formulário, equipe global com leitura/escrita por recurso e apresentação para parceiros com métricas objetivas.

Não inicia uma nova feature da sequência: mantém 26/42 implementações e F22 não iniciada. Gates locais e evidências da ampliação estão no registro vinculado; S7/CI/liberação remotas continuam EM REVISÃO. Sem nova branch, commit, push ou deploy; alterações existentes preservadas.

Resultado da ampliação: lint/typecheck/build dos dois pacotes aprovados; 382 testes frontend, 575 backend, 46 PostgreSQL e 37 Playwright finais aprovados. Capturas/hash, falhas corrigidas, alternativas e roteiro manual no refinamento vinculado. Não somar rodadas. S7 remoto permanece em revisão.
