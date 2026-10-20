# Execução F23 — Distribuidor de convites

Autorização: sequência F22 → F23 → F25. Implementação só após fechar validação F22. Branch existente, sem commit/push/deploy.

## S0 — D25 e contrato

- Reutilizar /r/:id e os destinos APROVADOS da F12; não cadastrar URLs diretamente no distribuidor. Dono escolhe revisões ativas de convites próprios, pesos inteiros 1–100 e pausa manual. Até 20 destinos, sem duplicatas nem o próprio convite-base.
- Round-robin ponderado por posições: pesos 1/3 produzem A,B,B,B. Cursor persistido no PostgreSQL e seleção transacional, sem Redis paralelo ou sorteio. Mudança confirmada reinicia o cursor; versão obsoleta retorna 409 sem efeito. Alternativa aleatória rejeitada por dificultar auditoria e proporcionalidade em amostras pequenas.
- Gravar configuração exige validação HTTPS/disponibilidade já usada pela F12 e revisão aprovada atual. Resolver não consulta rede externa a cada clique: exclui pausados, destinos desativados, revisões substituídas/bloqueadas e contas suspensas usando estado do servidor. Não infere grupo cheio ou ingresso confirmado.
- Se todos ficarem inelegíveis, mostrar indisponível sem Location; nunca retornar silenciosamente ao convite original. Voltar ao convite único é ação separada e explícita. Endereço público permanece igual em todas as alterações.
- Lock consistente com mutações F12 e rechecagem da revisão escolhida antes da resposta; pausar/alterar após uma requisição já concluída não desfaz o redirect anterior.
- Contagem diária por destino, apenas agregada, sem IP/cookies novos e sem chamar clique de membro; previews/dono/admin não contaminam métricas. Retenção 180 dias. Respeitar countAccess=false dos consumidores F37.
- Leitura/escrita usa a seção Convites já existente. Modelos/tabelas novos são necessários para persistir pesos, cursor e contagem independente sem transformar histórico F12 em configuração mutável.

## Reúso e validação planejada

validateRedirectDestination, validações de conteúdo e revisão F12, registro do tenant, BFF/CSRF, guard global, layout/controles locais. Testar sequência, pausa, zero destinos, pesos inválidos, isolamento, revisão obsoleta, rollback, concorrência e contagem real. PG e E2E executados nos registros abaixo. Migração aditiva, nenhum dado anterior alterado. Reversão preserva tabelas e exige desativar distribuidor explicitamente antes de retirar o código; não executar DROP/reset.

## Evidências S1–S6 locais

RED real do seletor: três falhas comportamentais e um controle passando; GREEN 4/4. Componentes novos e regressão F12: 5/5. Primeira versão do teste C02 tratava Select personalizado como nativo; corrigida para interação real com a opção. O teste também revelou seleção transitória vazia na edição de peso; seleção derivada do primeiro destino válido corrigiu a aplicação, sem trocar o controle compartilhado.

PostgreSQL/HTTP: 20/20 em destination-pools.pg.spec.ts (5 próprios, T01–T05) e redirects.pg.spec.ts (15 regressões F12). Inclui 20 requests concorrentes com 5/15 escolhas, pausa/revisão substituída, idade, isolamento, rollback, ausência de probe por clique, HEAD sem avanço e F37 sem duplicar contagem.

Playwright F23 desktop/mobile: 7/7, setup incluído. Rodada anterior com F22/F12: 19/23; quatro falhas de F23 ainda chamavam selectOption nativo. Reutilizado helper select-control existente; não foi substituído o Select da aplicação. F22 e F12 passaram nessa regressão. Logs output/f23-*.log; capturas e hashes em docs/frontend-profissional/evidencias/f23-2026-10-19/capturas.json. Inspeção nativa do modal mobile e gestão desktop encontrou gap com token inexistente; corrigido para space-6 e fonte text-xl. Nova captura/revalidação de composição no fechamento do lote.

Lint/typecheck/build backend e lint/typecheck frontend aprovados; Next de produção no harness. Não somar execuções repetidas. CI/liberação remota em revisão. Só migrations aditivas em bancos descartáveis até aqui. DELETE da configuração é desativação lógica: conserva pesos e métricas; retomar é confirmação explícita. Pausa rápida por PATCH /me/redirects/:id/pool/:revisionId pode parar destino mesmo inválido; retomar exige validação. Escolhas F37 continuam avançando a distribuição, mas respeitam countAccess=false sem criar nova contagem bruta. Nenhum controle automático de lotação foi implementado.

## Fechamento do lote

S0–S6 locais verificadas. PG próprio final 6/6: acrescentada prova de colaborador com invitations.write, autoria real no audit e negação imediata após retirada da escrita. Playwright próprio final 6/6, dentro dos 37/37 finais. Capturas finais 10, incluindo 1440/768/390 e 320px/zoom; composição/diálogo inspecionados nativamente depois da correção dos tokens. [Evidências e hashes](evidencias-f23.json). [Regressão compartilhada e comandos](execucao-f25.md).

Lote: backend 598/frontend 413, PG novo 19 e regressões PG 78, lint/typecheck/build aprovados. [Migração preserva convite anterior e demais dados](evidencias-migracoes-f22-f25.json), sem backfill; banco pessoal e externo preservados. S7/CI/liberação em revisão, sem novo commit/push/deploy. Parada após F25; F28 não iniciada.


## Refinamento de entrada e edição — 19/10/2026

[Fluxos guiados F22/F23/F25, decisões, alternativas e provas](refinamento-f22-f23-f25.md). Distribuição orientada na lista de Convites; contato na criação/edição e na visão geral; escolha manual/assistida antes da primeira página. Checkbox corrigido, busca movida para Página e prévia do rascunho nas quatro abas de edição. Mantém 29/42; F28 não iniciada e S7 remoto pendente. Sem commit/push/deploy novos. O registro vinculado complementa as provas históricas, sem reescrever os resultados anteriores.
