# Execução F38 — Exportação de Minha página

Data: 19/10/2026. Branch de trabalho: codex/roadmap-f37-testes. Sem commit, push ou deploy nesta execução.

## S0 / D40 — Decisões

- Exportação somente do proprietário ativo, derivado da sessão e tenant; ADMIN não ganha acesso a outra conta. A futura F20 não concede exportação ao editor por consequência do acesso de edição.
- JSON schemaVersion 1; rascunho salvo ou publicação atual, em leitura RepeatableRead, sem mutação nem migração. Reutiliza profileInput, ordenação persistida e guarda de proprietário.
- Campos explícitos: nome, endereço, descrição, restrição etária, item principal, aparência validada, grupos e itens na ordem atual. “Tokens” na proposta significa valores visuais da aparência; nunca tokens de sessão, medição, cobrança ou integração.
- Fotos e arquivos externos ficam fora. Manifesto informa a exclusão sem URL privada ou binário. Convites entram como destinos; vínculos internos de F37 não viram credenciais portáveis.
- Alternativas rejeitadas: dump do banco (exposição); ZIP com mídia (fora do escopo e retenção); importação/restauração automática (não aprovada); exportação pública/admin transversal (isolamento).
- Reutiliza BFF, transporte autenticado com renovação de sessão, controles Select/Field/Button/ErrorState e toolbar responsiva atual. Salva o rascunho antes da navegação pelo editor.

## Evidência em andamento

S1 RED: três testes de domínio executados e falhando por “Exportação ainda não implementada”; depois três verdes com implementação. Comando: npm --prefix backend test -- src/domain/profiles/profile-export.spec.ts.

S2–S6 em andamento; PG, componentes, E2E e inspeção visual ainda não concluídos. S7/CI/liberação não executados. Nenhum AC é declarado concluído por este registro parcial.

## Reversão

Retirar rota de exportação e ação da toolbar e reverter arquivos desta feature; não há alteração de schema ou backfill.

## Fechamento local S0–S6

Implementado GET /api/v1/me/profile/export?revision=draft|published, attachment JSON privado com no-store; BFF preserva Content-Disposition. Ação Exportar página na toolbar e atalhos atuais, com salvamento pendente antes da navegação. Tela /painel/perfil/exportar usa controles compartilhados, estado vazio acionável, erro recuperável e bloqueio de cliques concorrentes. Loading de rota reutiliza a composição.

D40 complementar: credenciais em userinfo ou parâmetros conhecidos de URL (token, access_token, api_key, authorization, signature e credenciais de assinatura S3) fazem o item ser omitido, com quantidade e explicação, sem devolver a credencial no manifesto. Não altera o rascunho. Pausa e exibição de rótulo dos canais F37 são exportadas sem IDs de handle/revisão/rede ou tokens assinados.

Validação: lint/typecheck dos dois pacotes aprovados; build backend aprovado; build Next de produção no harness aprovado. Backend global 549 testes no primeiro checkpoint e cinco testes de exportação aprovados na versão final (duas regras acrescentadas após a primeira regressão). Frontend global 352 no checkpoint e três testes de exportação na versão final. Não somar repetições. PG real: 50 testes em cinco arquivos, incluindo F09/F19/F37/F38 e relacionados F03, todos aprovados. A regressão F03 antiga passou nesta árvore, que contém ajustes posteriores do usuário; resultado local não substitui CI remoto.

Playwright final: 7/7 (setup + três jornadas em desktop e mobile), sem skips. Download lido do disco e JSON comparado; outra conta/ADMIN e visitante negados; erro de rede real no navegador, retry, teclado, Axe A/AA nos estados ensaiados, 320px com fonte a 200% sem overflow. Capturas desktop/mobile/sucesso/vazio/erro/zoom abertas e inspecionadas. Não houve teste físico de iPhone/Safari. A primeira tentativa falhou por DNS do cliente HTTP do teste; substituído por fetch no browser real, sem mock de persistência.

Evidência local: output/roadmap-f38/{backend-unit.log,frontend-unit.log,pg.log,e2e-verified.log}; capturas copiadas para docs/frontend-profissional/evidencias/f38-2026-10-19. Dados da fixture descartáveis; sem envio a serviços reais. Sem migração; sem alteração do banco pessoal 5437.

S7 permanece EM REVISÃO: CI Node22, aceite e liberação remota não executados. Não houve commit/push/deploy. Continuidade autorizada: próxima F05; parar apenas após F21.


## Refinamento solicitado após F21 — 19/10/2026

Implementação e decisões: [refinamento F05/F15/F20/F21/F38](refinamento-f05-f15-f20-f21-f38.md). Inclui importação JSON confirmada para rascunho, resumos com frequência no modal e desligamento direto, sidebar por contexto, prévia de campanha preservando o formulário, equipe global com leitura/escrita por recurso e apresentação para parceiros com métricas objetivas.

Não inicia uma nova feature da sequência: mantém 26/42 implementações e F22 não iniciada. Gates locais e evidências da ampliação estão no registro vinculado; S7/CI/liberação remotas continuam EM REVISÃO. Sem nova branch, commit, push ou deploy; alterações existentes preservadas.

Resultado da ampliação: lint/typecheck/build dos dois pacotes aprovados; 382 testes frontend, 575 backend, 46 PostgreSQL e 37 Playwright finais aprovados. Capturas/hash, falhas corrigidas, alternativas e roteiro manual no refinamento vinculado. Não somar rodadas. S7 remoto permanece em revisão.
