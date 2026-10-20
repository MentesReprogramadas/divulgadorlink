# Execução F05 — Seguir nichos

19/10/2026; continuidade autorizada até F21. Implementação ainda em preparação. Não altera preferências existentes da F02 silenciosamente.

## S0 / D06

- Seguir categoria não ativa e-mail. Adesão explícita separada, e-mail confirmado e conta ativa; desativado por padrão. Frequências semanal (7 dias) e mensal (30 dias), semanal inicial.
- Resumos somente de conteúdo geral. Nichos restritos não podem ser seguidos para resumo; redes restritas também são excluídas no envio. Alternativa de enviar conteúdo adulto mediante cookie rejeitada: cookie de navegação não autoriza conteúdo em e-mail.
- Ao começar a seguir, os links já publicados viram baseline, sem disparo retroativo. Novos links elegíveis após essa adesão entram em lotes limitados; IDs recebidos impedem repetição durante a adesão. Deixar de seguir remove essa relação; voltar a seguir cria nova baseline.
- Preferências usam o usuário e a versão de notificações da F02, com campos próprios, sem converter emailRenewal em consentimento para descoberta. Reutilizar renderer de e-mail, transporte e filas BullMQ.
- Descadastro por token aleatório de 256 bits de finalidade restrita, hash SHA-256 separado por propósito e vinculado ao lote/tenant/conta; válido por 30 dias. Sem e-mail/PII na URL. GET apenas exibe confirmação, POST cancela: leitores automáticos não cancelam por pré-carregar links.
- Lote persistido antes do provedor, chave idempotente estável e validade de retry inferior a 24h. Revalidar conta, e-mail, consentimento, adesão e publicação antes de cada tentativa. Se o conteúdo mudar durante retry, suprimir o lote: nunca reutilizar corpo obsoleto.
- Retenção: payload liberado após envio/cancelamento/expiração; metadados de lote por 30 dias. IDs mínimos de deduplicação permanecem durante a adesão, apagados ao desfazer adesão ou remover a conta. Alternativa de apagar IDs em 30 dias rejeitada por reenviar links antigos.
- Liberação operacional por flag própria, desligada por padrão; sem ativação de envio em produção nesta execução.

## Validação

Ainda não executada. S0 e reconciliação de schema/contratos em andamento; nenhuma entrega F05 declarada concluída.

## S1–S3 em andamento

RED: quatro testes de domínio e dois de componente falharam pelo comportamento ausente. Depois: 14 casos domínio/PG e dois componentes aprovados no checkpoint. Evidências provisórias output/roadmap-f38/f05-*.log; execução final terá diretório próprio F05.

Migração aditiva 20261019080000_niche_digests: preferências próprias no usuário, baseline/receipts por adesão e lote durável com índices de due/owner e unicidade parcial de lote pendente. FKs compostas impedem associação de outra conta/tenant; baseline usa INSERT SELECT no banco sem copiar catálogo inteiro para memória. Nenhum backfill de adesão ou e-mail. Alterar frequência cancela lote pendente e reinicia próximo período; F02 mantém seu consentimento independente.

O Prisma local não pôde substituir a DLL em uso (EPERM). Client gerado em saída temporária, binário comparado por SHA-256 e preservado, arquivos JS/tipos/runtime copiados para node_modules ignorado. A geração temporária tentou adicionar dependências nos manifestos da raiz; esse efeito foi revertido para HEAD (árvore inicial limpa), sem alterar dependências versionadas. Typecheck voltou a passar. Nenhum processo alheio encerrado.

Política de observabilidade: request_id e contagem/status sem conteúdo ou destinatário em logs. Links do resumo usam /link/:id do catálogo; saída e analytics continuam sob contratos/consentimento existentes. Não foram criados pixels de abertura ou tracking adicional.

## Fechamento local S0–S6

Entregue: /painel/interesses, navegação desktop/mobile, busca/filtro de adesão e modal de frequência/consentimento. GET/PUT/DELETE /me/followed-niches, PATCH /me/niche-digest-preferences e POST /niche-digests/unsubscribe, privados e estritos onde aplicável. /resumos/cancelar não cancela no GET; confirmação explícita por POST. Botões bloqueiam repetição, erros preservam entrada e foco/modal usam o componente compartilhado.

Worker/fila separados, lotes duráveis, retries com corpo/chave estáveis e máximo cinco tentativas dentro de 23 horas. Mudança de conteúdo, remoção de adesão, e-mail não confirmado, restrição/indisponibilidade e mudança de frequência impedem reutilizar o corpo. Falha de banco após sucesso no provedor reutiliza a mesma chave. Desativar a flag de envio mantém ciclos de limpeza: payloads pendentes são suprimidos; não altera consentimentos. Worker parado executará a limpeza ao retomar; não se promete remoção instantânea com serviço desligado.

D06/alternativas completas acima. Sender usa renderer e adapter de e-mail existentes; alias deliverRenewalReminder preservado, transporte compartilhado deliverQueuedEmail. Consentimento de analytics permanece independente. Sem preço/assinatura comercial novos.

Validação final: lint/typecheck frontend e backend aprovados; build backend aprovado; build Next de produção no harness. 555 testes backend na regressão completa com PIX_PROOF_DATABASE_URL apontando ao PG descartável; 355 frontend na regressão completa e dez testes afetados repetidos após ajuste de geometria. PG: 37 testes em três arquivos, incluindo dezesseis próprios, renovação F02 e exportação F38. Playwright: 19/19 (setup + nove jornadas desktop/mobile), sem skips ou falhas, cobrindo F05/F02/F38. Downloads e cancelamento persistido conferidos; fila BullMQ, PG, Redis, API e BFF reais com provedor externo local. Nenhum sucesso interno interceptado. Axe A/AA nos estados ensaiados, teclado, foco, geometria exata do card, 320px e fonte 200%. Capturas nativas de lista, outra conta, modal, skeleton, cancelamento e zoom abertas/inspecionadas. Emulação Chromium não prova iPhone físico/Safari.

Migração também ensaiada em banco descartável f05_upgrade: 47 migrations anteriores, usuário anterior com emailRenewal=true, upgrade aditivo, emailRenewal preservado e emailDigest=false, reader SQL anterior ainda funcional. Query plan usa niche_follows_pkey, niche_digest_due_idx e o índice F03 links_related_niche_idx. O índice F05 redundante criado inicialmente foi removido em migration corretiva 20261019081000_reuse_digest_niche_index, mantendo imutável o checksum já aplicado. Dezesseis PG próprios repetidos após a remoção, verdes. E2E foi executado antes da retirada desse índice sem mudança de comportamento; próximo lote inclui a correção. Não é medição de volume de produção.

Banco pessoal localhost:5437/divulgador atualizado com as duas migrations aditivas; contagens de usuários/páginas/links idênticas antes/depois e nenhuma adesão ativada. Baselines 5433/6380 preservados. Provas local-upgrade-proof.json, upgrade-*.log e index-reuse-proof.log. Recuperação: NICHE_DIGESTS_ENABLED=0 impede envios e limpa pendências no ciclo; rollback do app conserva colunas/tabelas e dados, sem down destrutivo. Não remover receipts enquanto houver adesão ativa.

Evidências: output/roadmap-f05/{backend-unit-final.log,frontend-unit.log,pg-verified.log,pg-index-reuse.log,e2e-verified.log}; RED em output/roadmap-f38/f05-{red,component-red}.log; capturas em docs/frontend-profissional/evidencias/f05-2026-10-19. Nova flag documentada em backend/.env.example; default desligado. Não foi ativado envio real em produção.

S7 EM REVISÃO: CI Node22, teste físico e liberação remota não executados. Sem branch/commit/push/deploy novos. Próxima F15; parada autorizada somente depois da F21.


## Refinamento solicitado após F21 — 19/10/2026

Implementação e decisões: [refinamento F05/F15/F20/F21/F38](refinamento-f05-f15-f20-f21-f38.md). Inclui importação JSON confirmada para rascunho, resumos com frequência no modal e desligamento direto, sidebar por contexto, prévia de campanha preservando o formulário, equipe global com leitura/escrita por recurso e apresentação para parceiros com métricas objetivas.

Não inicia uma nova feature da sequência: mantém 26/42 implementações e F22 não iniciada. Gates locais e evidências da ampliação estão no registro vinculado; S7/CI/liberação remotas continuam EM REVISÃO. Sem nova branch, commit, push ou deploy; alterações existentes preservadas.

Resultado da ampliação: lint/typecheck/build dos dois pacotes aprovados; 382 testes frontend, 575 backend, 46 PostgreSQL e 37 Playwright finais aprovados. Capturas/hash, falhas corrigidas, alternativas e roteiro manual no refinamento vinculado. Não somar rodadas. S7 remoto permanece em revisão.
