# F40 — Melhorar minha página

Implementação local iniciada em 21/10/2026 durante a revisão explícita das sete features e sua navegação. O registro anterior de parada após F36 foi superado somente para os pontos deste novo pedido; F41 não iniciada. S0–S6 implementadas e verificadas localmente. S7/CI/produção continuam pendentes; não há commit/push desta revisão.

## D42 — Regras e alternativas

- Análise determinística da configuração salva e de métricas reais da publicação; nenhum LLM, novo custo ou fetch de destinos dentro da consulta.
- Títulos: normalização NFKC, trim e comparação sem diferença entre maiúsculas/minúsculas. Só botões/grupos marcados visíveis no rascunho. Título repetido produz motivo/quantidade e ação de revisão, sem renomear nada.
- Organização: mais de vinte botões marcados visíveis gera sugestão opcional de agrupamento. Não é quota nem requisito para publicar.
- Destinos: aproveita estado UNAVAILABLE do catálogo/F07; checagem UNAVAILABLE recente considera 24 horas. URLs próprias não ganham monitoramento fictício: a cobertura declara quantas não foram testadas automaticamente. Sem declarar erro só porque faltou checagem.
- Interação: mesma definição e proteção F31, plano e medição ativos, publicação atual, período selecionado 7/30/90 dias, padrão 30; mínimo cem impressões por botão e menos de 1% de cliques. Evidência inclui impressões, cliques, versão e ordem salva na publicação. Posição não é usada para comparar injustamente botões diferentes nem inferir causa. Não considera apenas cliques absolutos e não inventa baixo desempenho quando falta amostra/plano/permissão ou a medição está pausada.
- Não promete crescimento ou ganho causal. O fato observado é uma taxa no período, sujeita à cobertura e à ordem da publicação, não pessoas únicas.
- Ignorar persiste em AuditLog, por chave de regra/versão/contexto da página, por até trinta dias. Alterar versão do rascunho reavalia; baixa interação também vincula a revisão publicada. Repetição é idempotente sob lock da página. Não armazena conteúdo ou PII no descarte. Registros de auditoria mantêm sua política existente; a consulta deixa de considerar descartes após trinta dias.
- Alternativas descartadas: checar todos os destinos por HTTP a cada visita ao painel (latência/efeitos externos), IA para regras simples (custo/não determinismo), quota de vinte itens (mudança comercial), corrigir automaticamente (perda de controle), tabela nova só para descartes já cobertos por auditoria (schema/transferência desnecessários), comparar CTR sem exposição e sem contexto de publicação (conclusão inválida).

## Contrato e interface

`GET /api/v1/me/profile/diagnostics?from&to`, `POST /api/v1/me/profile/diagnostics/:key/dismiss` com `{ruleVersion,from?,to?}`. Resposta privada com página/versão, findings, descartados e cobertura; tenant pelo host/sessão. Leitura exige `page.read`; ignorar exige `page.write` e EDIT no compartilhamento legado. Métricas globais só entram se também existir `reports.read`, além da cobertura F11/F31. Sem corpo de página alterado pelo diagnóstico.

Painel → Resultados e divulgação → **Melhorar minha página**, `/painel/perfil/diagnostico`. Ações à direita, filtros separados, carregamento equivalente, cards com motivo e evidência, ação “Revisar grupos e links” e “Ignorar sugestão”. Ausência de página orienta criação; ausência de dados distingue plano/permissão/medição/amostra. Sem buscar manualmente.

## Evidências executadas

- Domínio: três casos cobrindo normalização/ocultos/excesso, exposição mínima/posição e chave/ausência de métricas.
- PostgreSQL: F40-PG01 prova motivo, isolamento, descarte idempotente/expiração e versão intacta; F40-PG02/03 provam cem impressões, publicação, intervalo, pausa e separação entre página/relatórios/escrita. Consolidação: 54 aprovados em sete arquivos; repetição final dos dois arquivos com F40: 25 aprovados. Casos se sobrepõem.
- Componentes F40: três casos, incluindo motivo/ação, descarte, recuperação conservando filtro e período no calendário São Paulo. Incluídos nos 120 testes frontend aprovados em 35 arquivos.
- Playwright E01/E02 em desktop/mobile aprovado no lote de 53 e na revisão de 15. Exercita motivo/ação/descarte/reload, outro dono, versão não alterada, filtros sem Buscar, falha/retry e layout 320px. Axe não encontrou violações nas verificações executadas; isso não é declaração de acessibilidade total.
- Checks de pacote: lint/typecheck/build frontend/backend e inspeção de capturas conforme [revisão consolidada](../frontend-profissional/revisao-fluxos-2026-10-21.md). Sem alteração de baseline visual para silenciar falha. CI/liberação não executados.
- Navegação, vazio/loading/erro e cobertura sem métricas estão registrados nas capturas e relatórios da revisão. Falta de cobertura não é tratada como baixo desempenho.

## Operação e reversão

Sem nova migration ou variável de ambiente. API/frontend precisam ser reiniciados para carregar código. Métricas mantêm requisitos F11/F31; sugestões de texto/organização não exigem ativar rastreamento. Retirar a entrada e rotas novas reverte a funcionalidade preservando auditoria e página; não apagar contatos, snapshots, assinaturas ou eventos. Não foi aplicada alteração em produção nem no conteúdo de usuários reais.
