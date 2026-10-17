# Plano de implementação F12 — Link permanente para convites

**Estado:** CONCLUÍDO NA BRANCH, CI aprovado. Ordem 9, onda 2; dependências F42/G00/F07 concluídas. [Spec](../specs/f12-link-permanente.md), [registro e evidências](../execucao-f12.md), [ledger](../roadmap-etapas.csv). A instrução vigente determina parar após a F12. Sem main/deploy.

O plano inicial foi reconciliado com os arquivos e testes reais abaixo. Os cinco ACs originais foram preservados na spec/matriz. Itens condicionais dispensados e diferenças de sequência estão explícitos; não se presume teste ou implantação executada.

## F12-S0 Escopo contratos e revisão de reutilização

- [x] Aprovação automática após validações; suspeitos bloqueados para correção; D14 50 versões/180 dias preservando atual, cache no-store e recuperação revalidada.
- [x] Reutilizar canonicalUrl, safe-fetch/probe F07, moderação F09, canSubmit, CSRF/BFF, componentes/tokens e AgePrompt.
- [x] Modelos próprios necessários para identidade permanente e métricas separadas do catálogo; contratos strict com chave de reenvio e versão.
- [x] Fixture isolada redirects.localhost, portas/provedores locais e estratégia de migration aditiva antes do código.

## F12-S1 Testes unitários e componentes antes da regra

- [x] Quatro testes de entrada e três de transporte com falhas/recuperação; RED/GREEN de domínio preservado.
- [x] Três testes reais de componente: offline preserva chave/campos e impede duplicação; bloqueio mantém handle; falha de carga exige recuperação.
- [x] Identidade, cache e manutenção da revisão anterior comprovados em PG/E2E, onde o comportamento ocorre.
- [x] Regressão de F09 mantida após extrair fábrica compartilhada de portas.

**Desvio de sequência registrado:** componentes foram testados junto da implementação, sem evidência RED individual anterior. Não declarar TDD integral. Um RED adicional reproduziu o reenvio concorrente antes do fix final.

## F12-S2 Dados invariantes e migração

- [x] RedirectHandle/RedirectDestination/RedirectDaily; UUID estável, chave/hash, versões monotônicas, FK composta tenant e trigger de aprovação.
- [x] Reserva PENDING durável e publicação transacional; validação externa fora de transação; limites 50/180 sem apagar publicação atual.
- [x] Migration em clone com 42 tabelas existentes intactas; volume 10 mil por tabela nova e EXPLAIN dos quatro acessos.
- [x] Exclusão de conta anonimizada apaga explicitamente convites/perfis/mídia; teste usa implementação real.

Sem backfill ou vínculo dedicado a ProfileItem (opcional); usuário pode usar o endereço público validado. Histórico separado das métricas de promoção.

## F12-S3 Regra de negócio API e jobs

- [x] GET/POST `/api/v1/me/redirects`, GET `/:id`, POST `/:id/destinations`, POST `/:id/disable`, GET/HEAD `/api/v1/r/:id`.
- [x] Autorização por tenant/dono/status/e-mail confirmado, CSRF, validação de entrada, conteúdo e rede segura.
- [x] Idempotência, CAS, concorrência, retomada após interrupção e resultado persistido de reenvios simultâneos.
- [x] Público somente atual aprovado, idade antes de payload/rede/contagem, disponibilidade fresca e 302 no-store/noindex.
- [x] Contadores anônimos por revisão/dia; exclusão de dono/admin/HEAD; expurgo no worker diário existente.

Não há fila nova; casos condicionais de reentrega BullMQ não se aplicam. PENDING é retomado por reenvio com a mesma chave.

## F12-S4 Interface composição e estados

- [x] `/painel/convites`: lista paginada, criar, copiar, alterar, histórico, filtro de acessos e desativação confirmada.
- [x] Componentes de apresentação separados de transporte/orquestração; CSS Modules e primitivas locais, sem bibliotecas novas.
- [x] Loading/vazio/erro/bloqueio/conflito/offline com campos preservados; sucesso apenas após persistência e foco visível.
- [x] `/r/:handle/estado`: indisponibilidade clara, repetir acesso ou catálogo e reutilização da confirmação de idade.

Sem renderer de prévia novo; QR e histórico de publicação do perfil pertencem a features posteriores.

## F12-S5 Integração contrato persistência e falhas

- [x] Quinze casos em `backend/src/http/redirects.pg.spec.ts`, registrados no comando PG/CI, incluindo T01–T05.
- [x] Isolamento/CSRF/suspensão/e-mail; revisão concorrente/público durante pendência; falha de provedor/transação; idempotência e interrupção.
- [x] Constraints de tenant/aprovação, métricas por período/destino, HEAD/idade, retenção, desativação e exclusão de conta.
- [x] Regressão completa PG em banco descartável; teste de fuso do catálogo corrigido para o banco atual e restauração do estado anterior.

## F12-S6 E2E Playwright e revisão visual

- [x] `frontend/e2e/redirects.spec.ts` registrado em features/features-mobile; quatro cenários por projeto com BFF/API/DB/worker reais.
- [x] A→B no mesmo endereço, A durante pendência, indisponibilidade, isolamento, suspeita/falha, offline, conflito entre abas, idade antes de exposição.
- [x] Destino HTTPS externo servido pelo harness; certificado e DNS exclusivamente sintéticos no contexto Chromium convidado.
- [x] Inspeção real desktop/mobile e capturas revisadas; teclado/foco, 320px e texto 200% verificados. Limites de aparelhos/leitor de tela documentados.

## F12-S7 Regressão rollout e fechamento auditável

- [x] Finalizar lint/typecheck/unit/build dos dois pacotes e a regressão completa E2E/PG; registrar saídas finais.
- [x] Confirmar quatro jobs CI no SHA de implementação e salvar run/evidência.
- [x] Migration aditiva e reversão preservando dados ensaiadas; binário anterior não executado, limite documentado.
- [x] Operação futura/indicadores/risco de disponibilidade externa descritos; nenhum deploy é requisito para a entrega na branch.
- [x] Atualizar matriz, inventário, S0–S7 e registro com SHA/run; parar após F12, sem iniciar F19.

## Check de saída da feature

- [x] F12-AC01–AC05 com provas T01–T05 e regressão final aceita.
- [x] Reuso, contratos, migração, retenção, segurança e riscos documentados.
- [x] CI aceito e fechamento do roadmap. Deploy futuro exige sua própria autorização; não faz parte desta execução.

Fechamento: código `1809e1d97f0b7e7681409041a2073412352d91d6`; [CI 38971032480](https://github.com/MentesReprogramadas/divulgadorlink/actions/runs/38971032480) aprovado nos quatro jobs. Local: 431 backend, 201 frontend, 152 PG e 100 E2E; lint/typecheck/build dos dois pacotes aprovados. Sem deploy/main. Parada após F12.


## Extensão autorizada de revisão — 17/10/2026

A regra anterior de bloquear suspeitos sem revisão foi substituída pelo pedido de seguir o ciclo do catálogo: aprovação automática ou fila humana separada, recusa com motivo, uma contestação por envio e nova versão após correção. Segurança/URLs, permissões, publicação anterior e limites permanecem. Ver [contrato, critérios, implementação e evidências](../../frontend-profissional/revisao-paginas-convites.md). Esta extensão local não reatribui os commits/CI da entrega histórica nem inicia a próxima feature.
