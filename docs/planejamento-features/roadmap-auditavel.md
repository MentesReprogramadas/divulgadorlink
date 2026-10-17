# Roadmap auditável por etapa

**Baseline inicial:** 14 de outubro de 2026. **Repriorização:** 15 de outubro de 2026, F42 em primeiro lugar. **Execução:** P0/F42 concluído em produção e validado, por autorização posterior. Continuação F01–F41 autorizada em branch separada; F01 concluída na branch; F06 concluída na branch e F07 concluída na branch, com CI aprovado. F02, F03 e F04 concluídas na branch; ajuste aleatório de F03 validado e parada solicitada após F04. Autorização posterior concluiu somente F09, com D10 resolvida, seis ACs e S0–S7 verificados no CI 38940575906. A parada após F09 foi revogada em 16/10/2026 pela autorização de execução contínua. F12 concluída na branch com CI aprovado. A instrução posterior determina parar após F12; F19 não iniciada. Aprovação automática e retenção foram definidas pelo usuário, conforme [execução F12](execucao-f12.md). Ver [execução F09](execucao-f09.md) e [execução contínua](execucao-roadmap.md). Evidências em [execução F42](execucao-f42.md).

[Índice](README.md) · [Ordem](ordem-de-entrega.md) · [Decisões](decisoes.md) · [Qualidade](qualidade-e-testes.md) · [Ledger em CSV](roadmap-etapas.csv) · [Matriz AC](matriz-aceitacao.csv).

## Estados permitidos e evidências

NÃO INICIADA → EM ANDAMENTO → EM REVISÃO → CONCLUÍDA. BLOQUEADA pode ser usada com causa, responsável e condição de desbloqueio; não apagar o estado anterior do histórico. CONCLUÍDA requer gate e evidência, não apenas checkbox. Uma etapa que falha retorna a EM ANDAMENTO com registro da falha; consumidores não podem usar etapa pendente como dependência satisfeita.

O CSV é o ledger editável de execução. Esta visão Markdown descreve gates e sequência; atualizar ambos quando mudar sequência ou status. Matriz AC registra aprovação por critério separadamente. Status de documentação é independente do status de implementação.

Campos por etapa: feature, etapa, onda, dependências, estado, responsável, commit, ambiente, execução, comando, exit code, evidência, bloqueio e aceite. Tudo começa sem responsável/commit/evidência e sem teste executado. Não preencher com nome ou run fictício.

## Gate G00 de preparação compartilhada

- [x] G00-01 Registrar baseline da árvore e preservar mudanças locais; não presumir CI verde.
- [x] G00-02 Conferir contratos de teste: TTL de sessão, relógio de servidor, dataset A/B e seleção dos specs PG.
- [x] G00-03 Planejar e implementar descoberta features/features-mobile quando houver autorização de execução, mantendo setup/catalog.
- [x] G00-04 Rodar baseline futura em recursos descartáveis, armazenar relatórios e provas de descoberta.
- [x] G00-05 Habilitar retenção de artefatos de CI e política de dados nos relatórios; não expor cookies/secrets.
- [x] G00-06 Revisar a primeira feature com as decisões bloqueantes resolvidas. G00 não instala dependências por leitura do plano.

G00 mínimo de F42 concluído: árvore preservada, snapshot isolado, descoberta desktop/mobile, CI com artefatos e suítes locais aprovadas. As demais features exigem seus próprios gates.

## Gates comuns

| Etapa | Entrega | Critério de saída | Evidência mínima |
| --- | --- | --- | --- |
| S0 | Escopo contratos e reuso | Decisões e dependências resolvidas; ACs e contratos revisados | ADR, revisão de arquivos e fixture aprovada |
| S1 | Testes U e C | Falhas esperadas documentadas; casos específicos escritos | Relatório U/C vermelho por comportamento e vínculo dos IDs |
| S2 | Dados e migração | Constraints/projeções e compatibilidade verificadas | Diff de schema ou justificativa sem migration; ensaio de recuperação |
| S3 | Domínio API e jobs | Caso de uso integrado e U verde | Contrato HTTP e testes de regras; job/adapter quando aplicável |
| S4 | Interface | Fluxo e estados completos, C verde | Capturas desktop/mobile e testes de componente |
| S5 | Integração e ACs | I/PG/Redis e todos Tnn aprovados | Relatório de contrato, concorrência, persistência e falhas |
| S6 | Playwright e QA | E01/E02/E03 em desktop/mobile e gates manuais aplicáveis | Lista descoberta, HTML/JSON, trace, screenshots e ensaio manual |
| S7 | Regressão e liberação | DoD completo; reversão revisada; autorização de release | Commit, CI, matriz final, rollout/rollback e aceitação |

## Sequência por feature

### 1 F42 Moderação e alertas operacionais no grupo pela Evolution API

[Spec](specs/f42-evolution-moderacao.md) · [Plano](planos/f42-evolution-moderacao.md). Onda P0. Dependência: G00 mínimo. D44–D47 resolvidas. O limite anterior de parar no P0 foi substituído pela autorização de continuação do roadmap em branch separada.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F42-S0 | CONCLUÍDA | G00 mínimo | [Escopo contratos e revisão de reutilização](planos/f42-evolution-moderacao.md#f42-s0-escopo-contratos-e-revisão-de-reutilização) |
| F42-S1 | CONCLUÍDA | F42-S0 | CONCLUÍDA |
| F42-S2 | CONCLUÍDA | F42-S1 | CONCLUÍDA |
| F42-S3 | CONCLUÍDA | F42-S2 | CONCLUÍDA |
| F42-S4 | CONCLUÍDA | F42-S3 | CONCLUÍDA |
| F42-S5 | CONCLUÍDA | F42-S4 | CONCLUÍDA |
| F42-S6 | CONCLUÍDA | F42-S5 | CONCLUÍDA |
| F42-S7 | CONCLUÍDA | F42-S6 | CONCLUÍDA |


### 2 F01 Relatório de resultado do destaque

[Spec](specs/f01-resultado-destaque.md) · [Plano](planos/f01-resultado-destaque.md). Onda 1. Dependências: G00 e base existente. Decisões: D01 atribuição entre promoções sobrepostas e rateio do investimento por superfície; D02 cobertura e retenção.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F01-S0 | CONCLUÍDA | F42 (prioridade), G00 | [Escopo contratos e reuso](planos/f01-resultado-destaque.md#f01-s0-escopo-contratos-e-revisão-de-reutilização) |
| F01-S1 | CONCLUÍDA | F01-S0 | CONCLUÍDA |
| F01-S2 | CONCLUÍDA | F01-S1 | CONCLUÍDA |
| F01-S3 | CONCLUÍDA | F01-S2 | CONCLUÍDA |
| F01-S4 | CONCLUÍDA | F01-S3 | CONCLUÍDA |
| F01-S5 | CONCLUÍDA | F01-S4 | CONCLUÍDA |
| F01-S6 | CONCLUÍDA | F01-S5 | CONCLUÍDA |
| F01-S7 | CONCLUÍDA | F01-S6 | CONCLUÍDA |

### 3 F06 Denunciar um link

[Spec](specs/f06-denuncias.md) · [Plano](planos/f06-denuncias.md). Onda 1. Dependências: G00 e base existente. Decisões: D07 denúncia anônima ou autenticada, janela de deduplicação e retenção.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F06-S0 | CONCLUÍDA | F42 (prioridade), G00 | [Escopo contratos e reuso](planos/f06-denuncias.md#f06-s0-escopo-contratos-e-revisão-de-reutilização) |
| F06-S1 | CONCLUÍDA | F06-S0 | [Testes U e C](planos/f06-denuncias.md#f06-s1-testes-unitários-e-componentes-antes-da-regra) |
| F06-S2 | CONCLUÍDA | F06-S1 | [Dados e migração](planos/f06-denuncias.md#f06-s2-dados-invariantes-e-migração) |
| F06-S3 | CONCLUÍDA | F06-S2 | [Domínio API e jobs](planos/f06-denuncias.md#f06-s3-regra-de-negócio-api-e-jobs) |
| F06-S4 | CONCLUÍDA | F06-S3 | [Interface](planos/f06-denuncias.md#f06-s4-interface-composição-e-estados) |
| F06-S5 | CONCLUÍDA | F06-S4 | [Integração e ACs](planos/f06-denuncias.md#f06-s5-integração-contrato-persistência-e-falhas) |
| F06-S6 | CONCLUÍDA | F06-S5 | [Playwright e QA](planos/f06-denuncias.md#f06-s6-e2e-playwright-e-revisão-visual) |
| F06-S7 | CONCLUÍDA | F06-S6 | [Regressão e liberação](planos/f06-denuncias.md#f06-s7-regressão-rollout-e-fechamento-auditável) |

### 4 F07 Acompanhamento de disponibilidade

[Spec](specs/f07-disponibilidade.md) · [Plano](planos/f07-disponibilidade.md). Onda 1. Dependências: G00 e base existente. Decisões: D08 limiar/intervalo/backoff, transição de recuperação e compensação de promoção paga durante indisponibilidade.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F07-S0 | CONCLUÍDA | F42 (prioridade), G00 | [Escopo contratos e reuso](planos/f07-disponibilidade.md#f07-s0-escopo-contratos-e-revisão-de-reutilização) |
| F07-S1 | CONCLUÍDA | F07-S0 | [Testes U e C](planos/f07-disponibilidade.md#f07-s1-testes-unitários-e-componentes-antes-da-regra) |
| F07-S2 | CONCLUÍDA | F07-S1 | [Dados e migração](planos/f07-disponibilidade.md#f07-s2-dados-invariantes-e-migração) |
| F07-S3 | CONCLUÍDA | F07-S2 | [Domínio API e jobs](planos/f07-disponibilidade.md#f07-s3-regra-de-negócio-api-e-jobs) |
| F07-S4 | CONCLUÍDA | F07-S3 | [Interface](planos/f07-disponibilidade.md#f07-s4-interface-composição-e-estados) |
| F07-S5 | CONCLUÍDA | F07-S4 | [Integração e ACs](planos/f07-disponibilidade.md#f07-s5-integração-contrato-persistência-e-falhas) |
| F07-S6 | CONCLUÍDA | F07-S5 | [Playwright e QA](planos/f07-disponibilidade.md#f07-s6-e2e-playwright-e-revisão-visual) |
| F07-S7 | CONCLUÍDA | F07-S6 | [Regressão e liberação](planos/f07-disponibilidade.md#f07-s7-regressão-rollout-e-fechamento-auditável) |

### 5 F02 Lembrete de renovação

[Spec](specs/f02-lembrete-renovacao.md) · [Plano](planos/f02-lembrete-renovacao.md). Onda 2. Dependências: G00, F01. Decisões: D03 antecedência, frequência e preferências padrão; decisão explícita antes do agendamento.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F02-S0 | CONCLUÍDA | F42 (prioridade), F01 | [Escopo contratos e reuso](planos/f02-lembrete-renovacao.md#f02-s0-escopo-contratos-e-revisão-de-reutilização) |
| F02-S1 | CONCLUÍDA | F02-S0 | [Testes U e C](planos/f02-lembrete-renovacao.md#f02-s1-testes-unitários-e-componentes-antes-da-regra) |
| F02-S2 | CONCLUÍDA | F02-S1 | [Dados e migração](planos/f02-lembrete-renovacao.md#f02-s2-dados-invariantes-e-migração) |
| F02-S3 | CONCLUÍDA | F02-S2 | [Domínio API e jobs](planos/f02-lembrete-renovacao.md#f02-s3-regra-de-negócio-api-e-jobs) |
| F02-S4 | CONCLUÍDA | F02-S3 | [Interface](planos/f02-lembrete-renovacao.md#f02-s4-interface-composição-e-estados) |
| F02-S5 | CONCLUÍDA | F02-S4 | [Integração e ACs](planos/f02-lembrete-renovacao.md#f02-s5-integração-contrato-persistência-e-falhas) |
| F02-S6 | CONCLUÍDA | F02-S5 | [Playwright e QA](planos/f02-lembrete-renovacao.md#f02-s6-e2e-playwright-e-revisão-visual) |
| F02-S7 | CONCLUÍDA | F02-S6 | [Regressão e liberação](planos/f02-lembrete-renovacao.md#f02-s7-regressão-rollout-e-fechamento-auditável) |

### 6 F03 Links relacionados

[Spec](specs/f03-links-relacionados.md) · [Plano](planos/f03-links-relacionados.md). Onda 2. Dependências: G00 e base existente. Decisões: D04 quantidade e ordenação inicial; iniciar por nicho/rede, sem exigir embeddings.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F03-S0 | CONCLUÍDA | F42 (prioridade), G00 | [Escopo contratos e reuso](planos/f03-links-relacionados.md#f03-s0-escopo-contratos-e-revisão-de-reutilização) |
| F03-S1 | CONCLUÍDA | F03-S0 | [Testes U e C](planos/f03-links-relacionados.md#f03-s1-testes-unitários-e-componentes-antes-da-regra) |
| F03-S2 | CONCLUÍDA | F03-S1 | [Dados e migração](planos/f03-links-relacionados.md#f03-s2-dados-invariantes-e-migração) |
| F03-S3 | CONCLUÍDA | F03-S2 | [Domínio API e jobs](planos/f03-links-relacionados.md#f03-s3-regra-de-negócio-api-e-jobs) |
| F03-S4 | CONCLUÍDA | F03-S3 | [Interface](planos/f03-links-relacionados.md#f03-s4-interface-composição-e-estados) |
| F03-S5 | CONCLUÍDA | F03-S4 | [Integração e ACs](planos/f03-links-relacionados.md#f03-s5-integração-contrato-persistência-e-falhas) |
| F03-S6 | CONCLUÍDA | F03-S5 | [Playwright e QA](planos/f03-links-relacionados.md#f03-s6-e2e-playwright-e-revisão-visual) |
| F03-S7 | CONCLUÍDA | F03-S6 | [Regressão e liberação](planos/f03-links-relacionados.md#f03-s7-regressão-rollout-e-fechamento-auditável) |

### 7 F04 Favoritos e coleções

[Spec](specs/f04-favoritos-colecoes.md) · [Plano](planos/f04-favoritos-colecoes.md). Onda 2. Dependências: G00 e base existente. Decisões: D05 permitir múltiplas coleções por favorito, limites e ordenação.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F04-S0 | CONCLUÍDA | F42 (prioridade), G00 | [Escopo contratos e reuso](planos/f04-favoritos-colecoes.md#f04-s0-escopo-contratos-e-revisão-de-reutilização) |
| F04-S1 | CONCLUÍDA | F04-S0 | [Testes U e C](planos/f04-favoritos-colecoes.md#f04-s1-testes-unitários-e-componentes-antes-da-regra) |
| F04-S2 | CONCLUÍDA | F04-S1 | [Dados e migração](planos/f04-favoritos-colecoes.md#f04-s2-dados-invariantes-e-migração) |
| F04-S3 | CONCLUÍDA | F04-S2 | [Domínio API e jobs](planos/f04-favoritos-colecoes.md#f04-s3-regra-de-negócio-api-e-jobs) |
| F04-S4 | CONCLUÍDA | F04-S3 | [Interface](planos/f04-favoritos-colecoes.md#f04-s4-interface-composição-e-estados) |
| F04-S5 | CONCLUÍDA | F04-S4 | [Integração e ACs](planos/f04-favoritos-colecoes.md#f04-s5-integração-contrato-persistência-e-falhas) |
| F04-S6 | CONCLUÍDA | F04-S5 | [Playwright e QA](planos/f04-favoritos-colecoes.md#f04-s6-e2e-playwright-e-revisão-visual) |
| F04-S7 | CONCLUÍDA | F04-S6 | [Regressão e liberação](planos/f04-favoritos-colecoes.md#f04-s7-regressão-rollout-e-fechamento-auditável) |

### 8 F09 Perfil público com categorias próprias

[Spec](specs/f09-perfil-publico.md) · [Plano](planos/f09-perfil-publico.md). Onda 2. Dependências: G00 e base existente. Decisões: D10 unicidade de slug por tenant, regras de URL privada no perfil, mídia/limites e conteúdo restrito.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F09-S0 | CONCLUÍDA | F42 (prioridade), G00 | [Escopo contratos e reuso](planos/f09-perfil-publico.md#f09-s0-escopo-contratos-e-revisão-de-reutilização) |
| F09-S1 | CONCLUÍDA | F09-S0 | CONCLUÍDA |
| F09-S2 | CONCLUÍDA | F09-S1 | CONCLUÍDA |
| F09-S3 | CONCLUÍDA | F09-S2 | CONCLUÍDA |
| F09-S4 | CONCLUÍDA | F09-S3 | CONCLUÍDA |
| F09-S5 | CONCLUÍDA | F09-S4 | CONCLUÍDA |
| F09-S6 | CONCLUÍDA | F09-S5 | CONCLUÍDA |
| F09-S7 | CONCLUÍDA | F09-S6 | CONCLUÍDA |

### 9 F12 Link permanente para convites

[Spec](specs/f12-link-permanente.md) · [Plano](planos/f12-link-permanente.md). Onda 2. Dependências: G00, F07. Decisões: D14 política de cache, recuperação e retenção de revisões/handles.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F12-S0 | CONCLUÍDA | F42 (prioridade), F07 | [Escopo contratos e reuso](planos/f12-link-permanente.md#f12-s0-escopo-contratos-e-revisão-de-reutilização) |
| F12-S1 | CONCLUÍDA | F12-S0 | [Testes U e C](planos/f12-link-permanente.md#f12-s1-testes-unitários-e-componentes-antes-da-regra) |
| F12-S2 | CONCLUÍDA | F12-S1 | [Dados e migração](planos/f12-link-permanente.md#f12-s2-dados-invariantes-e-migração) |
| F12-S3 | CONCLUÍDA | F12-S2 | [Domínio API e jobs](planos/f12-link-permanente.md#f12-s3-regra-de-negócio-api-e-jobs) |
| F12-S4 | CONCLUÍDA | F12-S3 | [Interface](planos/f12-link-permanente.md#f12-s4-interface-composição-e-estados) |
| F12-S5 | CONCLUÍDA | F12-S4 | [Integração e ACs](planos/f12-link-permanente.md#f12-s5-integração-contrato-persistência-e-falhas) |
| F12-S6 | CONCLUÍDA | F12-S5 | [Playwright e QA](planos/f12-link-permanente.md#f12-s6-e2e-playwright-e-revisão-visual) |
| F12-S7 | CONCLUÍDA | F12-S6 | [Regressão e liberação](planos/f12-link-permanente.md#f12-s7-regressão-rollout-e-fechamento-auditável) |

### 10 F19 Prévia e histórico de versões

[Spec](specs/f19-historico-versoes.md) · [Plano](planos/f19-historico-versoes.md). Onda 2. Dependências: G00, F09. Decisões: D21 retenção, máximo de versões e recuperação de mídia removida.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F19-S0 | NÃO INICIADA | F42 (prioridade), F09 | [Escopo contratos e reuso](planos/f19-historico-versoes.md#f19-s0-escopo-contratos-e-revisão-de-reutilização) |
| F19-S1 | NÃO INICIADA | F19-S0 | [Testes U e C](planos/f19-historico-versoes.md#f19-s1-testes-unitários-e-componentes-antes-da-regra) |
| F19-S2 | NÃO INICIADA | F19-S1 | [Dados e migração](planos/f19-historico-versoes.md#f19-s2-dados-invariantes-e-migração) |
| F19-S3 | NÃO INICIADA | F19-S2 | [Domínio API e jobs](planos/f19-historico-versoes.md#f19-s3-regra-de-negócio-api-e-jobs) |
| F19-S4 | NÃO INICIADA | F19-S3 | [Interface](planos/f19-historico-versoes.md#f19-s4-interface-composição-e-estados) |
| F19-S5 | NÃO INICIADA | F19-S4 | [Integração e ACs](planos/f19-historico-versoes.md#f19-s5-integração-contrato-persistência-e-falhas) |
| F19-S6 | NÃO INICIADA | F19-S5 | [Playwright e QA](planos/f19-historico-versoes.md#f19-s6-e2e-playwright-e-revisão-visual) |
| F19-S7 | NÃO INICIADA | F19-S6 | [Regressão e liberação](planos/f19-historico-versoes.md#f19-s7-regressão-rollout-e-fechamento-auditável) |

### 11 F08 Painel de oportunidades de busca

[Spec](specs/f08-oportunidades-busca.md) · [Plano](planos/f08-oportunidades-busca.md). Onda 3. Dependências: G00 e base existente. Decisões: D09 amostra mínima, normalização, retenção e escolha de consentimento para observações.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F08-S0 | NÃO INICIADA | F42 (prioridade), G00 | [Escopo contratos e reuso](planos/f08-oportunidades-busca.md#f08-s0-escopo-contratos-e-revisão-de-reutilização) |
| F08-S1 | NÃO INICIADA | F08-S0 | [Testes U e C](planos/f08-oportunidades-busca.md#f08-s1-testes-unitários-e-componentes-antes-da-regra) |
| F08-S2 | NÃO INICIADA | F08-S1 | [Dados e migração](planos/f08-oportunidades-busca.md#f08-s2-dados-invariantes-e-migração) |
| F08-S3 | NÃO INICIADA | F08-S2 | [Domínio API e jobs](planos/f08-oportunidades-busca.md#f08-s3-regra-de-negócio-api-e-jobs) |
| F08-S4 | NÃO INICIADA | F08-S3 | [Interface](planos/f08-oportunidades-busca.md#f08-s4-interface-composição-e-estados) |
| F08-S5 | NÃO INICIADA | F08-S4 | [Integração e ACs](planos/f08-oportunidades-busca.md#f08-s5-integração-contrato-persistência-e-falhas) |
| F08-S6 | NÃO INICIADA | F08-S5 | [Playwright e QA](planos/f08-oportunidades-busca.md#f08-s6-e2e-playwright-e-revisão-visual) |
| F08-S7 | NÃO INICIADA | F08-S6 | [Regressão e liberação](planos/f08-oportunidades-busca.md#f08-s7-regressão-rollout-e-fechamento-auditável) |

### 12 F11 Planos para perfis e páginas

[Spec](specs/f11-planos-perfis.md) · [Plano](planos/f11-planos-perfis.md). Onda 3. Dependências: G00, F09. Decisões: D13 preços, limites, periodicidade, prorrata, provedor e tratamento tributário; D12 grace/cancelamento.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F11-S0 | NÃO INICIADA | F42 (prioridade), F09 | [Escopo contratos e reuso](planos/f11-planos-perfis.md#f11-s0-escopo-contratos-e-revisão-de-reutilização) |
| F11-S1 | NÃO INICIADA | F11-S0 | [Testes U e C](planos/f11-planos-perfis.md#f11-s1-testes-unitários-e-componentes-antes-da-regra) |
| F11-S2 | NÃO INICIADA | F11-S1 | [Dados e migração](planos/f11-planos-perfis.md#f11-s2-dados-invariantes-e-migração) |
| F11-S3 | NÃO INICIADA | F11-S2 | [Domínio API e jobs](planos/f11-planos-perfis.md#f11-s3-regra-de-negócio-api-e-jobs) |
| F11-S4 | NÃO INICIADA | F11-S3 | [Interface](planos/f11-planos-perfis.md#f11-s4-interface-composição-e-estados) |
| F11-S5 | NÃO INICIADA | F11-S4 | [Integração e ACs](planos/f11-planos-perfis.md#f11-s5-integração-contrato-persistência-e-falhas) |
| F11-S6 | NÃO INICIADA | F11-S5 | [Playwright e QA](planos/f11-planos-perfis.md#f11-s6-e2e-playwright-e-revisão-visual) |
| F11-S7 | NÃO INICIADA | F11-S6 | [Regressão e liberação](planos/f11-planos-perfis.md#f11-s7-regressão-rollout-e-fechamento-auditável) |

### 13 F13 QR Code permanente

[Spec](specs/f13-qr-permanente.md) · [Plano](planos/f13-qr-permanente.md). Onda 3. Dependências: G00, F09, F12. Decisões: D15 formatos, tamanho e método de decodificação para teste; adicionar dependência só se inexistente e justificada.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F13-S0 | NÃO INICIADA | F42 (prioridade), F09, F12 | [Escopo contratos e reuso](planos/f13-qr-permanente.md#f13-s0-escopo-contratos-e-revisão-de-reutilização) |
| F13-S1 | NÃO INICIADA | F13-S0 | [Testes U e C](planos/f13-qr-permanente.md#f13-s1-testes-unitários-e-componentes-antes-da-regra) |
| F13-S2 | NÃO INICIADA | F13-S1 | [Dados e migração](planos/f13-qr-permanente.md#f13-s2-dados-invariantes-e-migração) |
| F13-S3 | NÃO INICIADA | F13-S2 | [Domínio API e jobs](planos/f13-qr-permanente.md#f13-s3-regra-de-negócio-api-e-jobs) |
| F13-S4 | NÃO INICIADA | F13-S3 | [Interface](planos/f13-qr-permanente.md#f13-s4-interface-composição-e-estados) |
| F13-S5 | NÃO INICIADA | F13-S4 | [Integração e ACs](planos/f13-qr-permanente.md#f13-s5-integração-contrato-persistência-e-falhas) |
| F13-S6 | NÃO INICIADA | F13-S5 | [Playwright e QA](planos/f13-qr-permanente.md#f13-s6-e2e-playwright-e-revisão-visual) |
| F13-S7 | NÃO INICIADA | F13-S6 | [Regressão e liberação](planos/f13-qr-permanente.md#f13-s7-regressão-rollout-e-fechamento-auditável) |

### 14 F14 Agendamento de links

[Spec](specs/f14-agendamento.md) · [Plano](planos/f14-agendamento.md). Onda 3. Dependências: G00, F09. Decisões: D16 convenção de intervalo e comportamento de datas ambíguas em fuso.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F14-S0 | NÃO INICIADA | F42 (prioridade), F09 | [Escopo contratos e reuso](planos/f14-agendamento.md#f14-s0-escopo-contratos-e-revisão-de-reutilização) |
| F14-S1 | NÃO INICIADA | F14-S0 | [Testes U e C](planos/f14-agendamento.md#f14-s1-testes-unitários-e-componentes-antes-da-regra) |
| F14-S2 | NÃO INICIADA | F14-S1 | [Dados e migração](planos/f14-agendamento.md#f14-s2-dados-invariantes-e-migração) |
| F14-S3 | NÃO INICIADA | F14-S2 | [Domínio API e jobs](planos/f14-agendamento.md#f14-s3-regra-de-negócio-api-e-jobs) |
| F14-S4 | NÃO INICIADA | F14-S3 | [Interface](planos/f14-agendamento.md#f14-s4-interface-composição-e-estados) |
| F14-S5 | NÃO INICIADA | F14-S4 | [Integração e ACs](planos/f14-agendamento.md#f14-s5-integração-contrato-persistência-e-falhas) |
| F14-S6 | NÃO INICIADA | F14-S5 | [Playwright e QA](planos/f14-agendamento.md#f14-s6-e2e-playwright-e-revisão-visual) |
| F14-S7 | NÃO INICIADA | F14-S6 | [Regressão e liberação](planos/f14-agendamento.md#f14-s7-regressão-rollout-e-fechamento-auditável) |

### 15 F16 Templates por atividade

[Spec](specs/f16-templates.md) · [Plano](planos/f16-templates.md). Onda 3. Dependências: G00, F09, F19. Decisões: D18 modelos iniciais, regras de preservação de conteúdo e limites de personalização.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F16-S0 | NÃO INICIADA | F42 (prioridade), F09, F19 | [Escopo contratos e reuso](planos/f16-templates.md#f16-s0-escopo-contratos-e-revisão-de-reutilização) |
| F16-S1 | NÃO INICIADA | F16-S0 | [Testes U e C](planos/f16-templates.md#f16-s1-testes-unitários-e-componentes-antes-da-regra) |
| F16-S2 | NÃO INICIADA | F16-S1 | [Dados e migração](planos/f16-templates.md#f16-s2-dados-invariantes-e-migração) |
| F16-S3 | NÃO INICIADA | F16-S2 | [Domínio API e jobs](planos/f16-templates.md#f16-s3-regra-de-negócio-api-e-jobs) |
| F16-S4 | NÃO INICIADA | F16-S3 | [Interface](planos/f16-templates.md#f16-s4-interface-composição-e-estados) |
| F16-S5 | NÃO INICIADA | F16-S4 | [Integração e ACs](planos/f16-templates.md#f16-s5-integração-contrato-persistência-e-falhas) |
| F16-S6 | NÃO INICIADA | F16-S5 | [Playwright e QA](planos/f16-templates.md#f16-s6-e2e-playwright-e-revisão-visual) |
| F16-S7 | NÃO INICIADA | F16-S6 | [Regressão e liberação](planos/f16-templates.md#f16-s7-regressão-rollout-e-fechamento-auditável) |

### 16 F17 Importação em lote

[Spec](specs/f17-importacao-lote.md) · [Plano](planos/f17-importacao-lote.md). Onda 3. Dependências: G00, F09. Decisões: D19 tamanho de lote, atomicidade ou sucesso parcial e expiração da prévia.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F17-S0 | NÃO INICIADA | F42 (prioridade), F09 | [Escopo contratos e reuso](planos/f17-importacao-lote.md#f17-s0-escopo-contratos-e-revisão-de-reutilização) |
| F17-S1 | NÃO INICIADA | F17-S0 | [Testes U e C](planos/f17-importacao-lote.md#f17-s1-testes-unitários-e-componentes-antes-da-regra) |
| F17-S2 | NÃO INICIADA | F17-S1 | [Dados e migração](planos/f17-importacao-lote.md#f17-s2-dados-invariantes-e-migração) |
| F17-S3 | NÃO INICIADA | F17-S2 | [Domínio API e jobs](planos/f17-importacao-lote.md#f17-s3-regra-de-negócio-api-e-jobs) |
| F17-S4 | NÃO INICIADA | F17-S3 | [Interface](planos/f17-importacao-lote.md#f17-s4-interface-composição-e-estados) |
| F17-S5 | NÃO INICIADA | F17-S4 | [Integração e ACs](planos/f17-importacao-lote.md#f17-s5-integração-contrato-persistência-e-falhas) |
| F17-S6 | NÃO INICIADA | F17-S5 | [Playwright e QA](planos/f17-importacao-lote.md#f17-s6-e2e-playwright-e-revisão-visual) |
| F17-S7 | NÃO INICIADA | F17-S6 | [Regressão e liberação](planos/f17-importacao-lote.md#f17-s7-regressão-rollout-e-fechamento-auditável) |

### 17 F18 Busca dentro do perfil

[Spec](specs/f18-busca-perfil.md) · [Plano](planos/f18-busca-perfil.md). Onda 3. Dependências: G00, F09, F14. Decisões: D20 tamanho mínimo de busca e paginação; começar lexical.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F18-S0 | NÃO INICIADA | F42 (prioridade), F09, F14 | [Escopo contratos e reuso](planos/f18-busca-perfil.md#f18-s0-escopo-contratos-e-revisão-de-reutilização) |
| F18-S1 | NÃO INICIADA | F18-S0 | [Testes U e C](planos/f18-busca-perfil.md#f18-s1-testes-unitários-e-componentes-antes-da-regra) |
| F18-S2 | NÃO INICIADA | F18-S1 | [Dados e migração](planos/f18-busca-perfil.md#f18-s2-dados-invariantes-e-migração) |
| F18-S3 | NÃO INICIADA | F18-S2 | [Domínio API e jobs](planos/f18-busca-perfil.md#f18-s3-regra-de-negócio-api-e-jobs) |
| F18-S4 | NÃO INICIADA | F18-S3 | [Interface](planos/f18-busca-perfil.md#f18-s4-interface-composição-e-estados) |
| F18-S5 | NÃO INICIADA | F18-S4 | [Integração e ACs](planos/f18-busca-perfil.md#f18-s5-integração-contrato-persistência-e-falhas) |
| F18-S6 | NÃO INICIADA | F18-S5 | [Playwright e QA](planos/f18-busca-perfil.md#f18-s6-e2e-playwright-e-revisão-visual) |
| F18-S7 | NÃO INICIADA | F18-S6 | [Regressão e liberação](planos/f18-busca-perfil.md#f18-s7-regressão-rollout-e-fechamento-auditável) |

### 18 F27 Filtros por cidade idioma e modalidade

[Spec](specs/f27-filtros-locais.md) · [Plano](planos/f27-filtros-locais.md). Onda 3. Dependências: G00 e base existente. Decisões: D29 origem do catálogo de localidades, semântica de ausentes e migração de metadados.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F27-S0 | NÃO INICIADA | F42 (prioridade), G00 | [Escopo contratos e reuso](planos/f27-filtros-locais.md#f27-s0-escopo-contratos-e-revisão-de-reutilização) |
| F27-S1 | NÃO INICIADA | F27-S0 | [Testes U e C](planos/f27-filtros-locais.md#f27-s1-testes-unitários-e-componentes-antes-da-regra) |
| F27-S2 | NÃO INICIADA | F27-S1 | [Dados e migração](planos/f27-filtros-locais.md#f27-s2-dados-invariantes-e-migração) |
| F27-S3 | NÃO INICIADA | F27-S2 | [Domínio API e jobs](planos/f27-filtros-locais.md#f27-s3-regra-de-negócio-api-e-jobs) |
| F27-S4 | NÃO INICIADA | F27-S3 | [Interface](planos/f27-filtros-locais.md#f27-s4-interface-composição-e-estados) |
| F27-S5 | NÃO INICIADA | F27-S4 | [Integração e ACs](planos/f27-filtros-locais.md#f27-s5-integração-contrato-persistência-e-falhas) |
| F27-S6 | NÃO INICIADA | F27-S5 | [Playwright e QA](planos/f27-filtros-locais.md#f27-s6-e2e-playwright-e-revisão-visual) |
| F27-S7 | NÃO INICIADA | F27-S6 | [Regressão e liberação](planos/f27-filtros-locais.md#f27-s7-regressão-rollout-e-fechamento-auditável) |

### 19 F31 Mapa de interação da página

[Spec](specs/f31-interacao-pagina.md) · [Plano](planos/f31-interacao-pagina.md). Onda 3. Dependências: G00, F09, F19. Decisões: D33 taxonomia, sessão, consentimento, retenção e amostra para estatísticas de perfil.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F31-S0 | NÃO INICIADA | F42 (prioridade), F09, F19 | [Escopo contratos e reuso](planos/f31-interacao-pagina.md#f31-s0-escopo-contratos-e-revisão-de-reutilização) |
| F31-S1 | NÃO INICIADA | F31-S0 | [Testes U e C](planos/f31-interacao-pagina.md#f31-s1-testes-unitários-e-componentes-antes-da-regra) |
| F31-S2 | NÃO INICIADA | F31-S1 | [Dados e migração](planos/f31-interacao-pagina.md#f31-s2-dados-invariantes-e-migração) |
| F31-S3 | NÃO INICIADA | F31-S2 | [Domínio API e jobs](planos/f31-interacao-pagina.md#f31-s3-regra-de-negócio-api-e-jobs) |
| F31-S4 | NÃO INICIADA | F31-S3 | [Interface](planos/f31-interacao-pagina.md#f31-s4-interface-composição-e-estados) |
| F31-S5 | NÃO INICIADA | F31-S4 | [Integração e ACs](planos/f31-interacao-pagina.md#f31-s5-integração-contrato-persistência-e-falhas) |
| F31-S6 | NÃO INICIADA | F31-S5 | [Playwright e QA](planos/f31-interacao-pagina.md#f31-s6-e2e-playwright-e-revisão-visual) |
| F31-S7 | NÃO INICIADA | F31-S6 | [Regressão e liberação](planos/f31-interacao-pagina.md#f31-s7-regressão-rollout-e-fechamento-auditável) |

### 20 F34 Checklist de publicação

[Spec](specs/f34-checklist-publicacao.md) · [Plano](planos/f34-checklist-publicacao.md). Onda 3. Dependências: G00, F09. Decisões: D36 passos iniciais e eventos de intenção versus compartilhamento confirmado.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F34-S0 | NÃO INICIADA | F42 (prioridade), F09 | [Escopo contratos e reuso](planos/f34-checklist-publicacao.md#f34-s0-escopo-contratos-e-revisão-de-reutilização) |
| F34-S1 | NÃO INICIADA | F34-S0 | [Testes U e C](planos/f34-checklist-publicacao.md#f34-s1-testes-unitários-e-componentes-antes-da-regra) |
| F34-S2 | NÃO INICIADA | F34-S1 | [Dados e migração](planos/f34-checklist-publicacao.md#f34-s2-dados-invariantes-e-migração) |
| F34-S3 | NÃO INICIADA | F34-S2 | [Domínio API e jobs](planos/f34-checklist-publicacao.md#f34-s3-regra-de-negócio-api-e-jobs) |
| F34-S4 | NÃO INICIADA | F34-S3 | [Interface](planos/f34-checklist-publicacao.md#f34-s4-interface-composição-e-estados) |
| F34-S5 | NÃO INICIADA | F34-S4 | [Integração e ACs](planos/f34-checklist-publicacao.md#f34-s5-integração-contrato-persistência-e-falhas) |
| F34-S6 | NÃO INICIADA | F34-S5 | [Playwright e QA](planos/f34-checklist-publicacao.md#f34-s6-e2e-playwright-e-revisão-visual) |
| F34-S7 | NÃO INICIADA | F34-S6 | [Regressão e liberação](planos/f34-checklist-publicacao.md#f34-s7-regressão-rollout-e-fechamento-auditável) |

### 21 F37 Botão com alternativas de acesso

[Spec](specs/f37-alternativas-acesso.md) · [Plano](planos/f37-alternativas-acesso.md). Onda 3. Dependências: G00, F09, F12. Decisões: D39 layout, limite de canais e semântica de indisponíveis.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F37-S0 | NÃO INICIADA | F42 (prioridade), F09, F12 | [Escopo contratos e reuso](planos/f37-alternativas-acesso.md#f37-s0-escopo-contratos-e-revisão-de-reutilização) |
| F37-S1 | NÃO INICIADA | F37-S0 | [Testes U e C](planos/f37-alternativas-acesso.md#f37-s1-testes-unitários-e-componentes-antes-da-regra) |
| F37-S2 | NÃO INICIADA | F37-S1 | [Dados e migração](planos/f37-alternativas-acesso.md#f37-s2-dados-invariantes-e-migração) |
| F37-S3 | NÃO INICIADA | F37-S2 | [Domínio API e jobs](planos/f37-alternativas-acesso.md#f37-s3-regra-de-negócio-api-e-jobs) |
| F37-S4 | NÃO INICIADA | F37-S3 | [Interface](planos/f37-alternativas-acesso.md#f37-s4-interface-composição-e-estados) |
| F37-S5 | NÃO INICIADA | F37-S4 | [Integração e ACs](planos/f37-alternativas-acesso.md#f37-s5-integração-contrato-persistência-e-falhas) |
| F37-S6 | NÃO INICIADA | F37-S5 | [Playwright e QA](planos/f37-alternativas-acesso.md#f37-s6-e2e-playwright-e-revisão-visual) |
| F37-S7 | NÃO INICIADA | F37-S6 | [Regressão e liberação](planos/f37-alternativas-acesso.md#f37-s7-regressão-rollout-e-fechamento-auditável) |

### 22 F38 Exportação do perfil

[Spec](specs/f38-exportacao-perfil.md) · [Plano](planos/f38-exportacao-perfil.md). Onda 3. Dependências: G00, F09, F19. Decisões: D40 campos exportáveis, acesso de colaboradores e política de mídia.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F38-S0 | NÃO INICIADA | F42 (prioridade), F09, F19 | [Escopo contratos e reuso](planos/f38-exportacao-perfil.md#f38-s0-escopo-contratos-e-revisão-de-reutilização) |
| F38-S1 | NÃO INICIADA | F38-S0 | [Testes U e C](planos/f38-exportacao-perfil.md#f38-s1-testes-unitários-e-componentes-antes-da-regra) |
| F38-S2 | NÃO INICIADA | F38-S1 | [Dados e migração](planos/f38-exportacao-perfil.md#f38-s2-dados-invariantes-e-migração) |
| F38-S3 | NÃO INICIADA | F38-S2 | [Domínio API e jobs](planos/f38-exportacao-perfil.md#f38-s3-regra-de-negócio-api-e-jobs) |
| F38-S4 | NÃO INICIADA | F38-S3 | [Interface](planos/f38-exportacao-perfil.md#f38-s4-interface-composição-e-estados) |
| F38-S5 | NÃO INICIADA | F38-S4 | [Integração e ACs](planos/f38-exportacao-perfil.md#f38-s5-integração-contrato-persistência-e-falhas) |
| F38-S6 | NÃO INICIADA | F38-S5 | [Playwright e QA](planos/f38-exportacao-perfil.md#f38-s6-e2e-playwright-e-revisão-visual) |
| F38-S7 | NÃO INICIADA | F38-S6 | [Regressão e liberação](planos/f38-exportacao-perfil.md#f38-s7-regressão-rollout-e-fechamento-auditável) |

### 23 F05 Seguir nichos

[Spec](specs/f05-seguir-nichos.md) · [Plano](planos/f05-seguir-nichos.md). Onda 4. Dependências: G00, F02. Decisões: D06 frequência, consentimento, retenção do histórico de resumo e regras de conteúdo restrito.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F05-S0 | NÃO INICIADA | F42 (prioridade), F02 | [Escopo contratos e reuso](planos/f05-seguir-nichos.md#f05-s0-escopo-contratos-e-revisão-de-reutilização) |
| F05-S1 | NÃO INICIADA | F05-S0 | [Testes U e C](planos/f05-seguir-nichos.md#f05-s1-testes-unitários-e-componentes-antes-da-regra) |
| F05-S2 | NÃO INICIADA | F05-S1 | [Dados e migração](planos/f05-seguir-nichos.md#f05-s2-dados-invariantes-e-migração) |
| F05-S3 | NÃO INICIADA | F05-S2 | [Domínio API e jobs](planos/f05-seguir-nichos.md#f05-s3-regra-de-negócio-api-e-jobs) |
| F05-S4 | NÃO INICIADA | F05-S3 | [Interface](planos/f05-seguir-nichos.md#f05-s4-interface-composição-e-estados) |
| F05-S5 | NÃO INICIADA | F05-S4 | [Integração e ACs](planos/f05-seguir-nichos.md#f05-s5-integração-contrato-persistência-e-falhas) |
| F05-S6 | NÃO INICIADA | F05-S5 | [Playwright e QA](planos/f05-seguir-nichos.md#f05-s6-e2e-playwright-e-revisão-visual) |
| F05-S7 | NÃO INICIADA | F05-S6 | [Regressão e liberação](planos/f05-seguir-nichos.md#f05-s7-regressão-rollout-e-fechamento-auditável) |

### 24 F15 Página por campanha

[Spec](specs/f15-pagina-campanha.md) · [Plano](planos/f15-pagina-campanha.md). Onda 4. Dependências: G00, F09, F19. Decisões: D17 cópia versus referência dos destinos, URL e comportamento após arquivar.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F15-S0 | NÃO INICIADA | F42 (prioridade), F09, F19 | [Escopo contratos e reuso](planos/f15-pagina-campanha.md#f15-s0-escopo-contratos-e-revisão-de-reutilização) |
| F15-S1 | NÃO INICIADA | F15-S0 | [Testes U e C](planos/f15-pagina-campanha.md#f15-s1-testes-unitários-e-componentes-antes-da-regra) |
| F15-S2 | NÃO INICIADA | F15-S1 | [Dados e migração](planos/f15-pagina-campanha.md#f15-s2-dados-invariantes-e-migração) |
| F15-S3 | NÃO INICIADA | F15-S2 | [Domínio API e jobs](planos/f15-pagina-campanha.md#f15-s3-regra-de-negócio-api-e-jobs) |
| F15-S4 | NÃO INICIADA | F15-S3 | [Interface](planos/f15-pagina-campanha.md#f15-s4-interface-composição-e-estados) |
| F15-S5 | NÃO INICIADA | F15-S4 | [Integração e ACs](planos/f15-pagina-campanha.md#f15-s5-integração-contrato-persistência-e-falhas) |
| F15-S6 | NÃO INICIADA | F15-S5 | [Playwright e QA](planos/f15-pagina-campanha.md#f15-s6-e2e-playwright-e-revisão-visual) |
| F15-S7 | NÃO INICIADA | F15-S6 | [Regressão e liberação](planos/f15-pagina-campanha.md#f15-s7-regressão-rollout-e-fechamento-auditável) |

### 25 F20 Equipe e permissões

[Spec](specs/f20-equipe-permissoes.md) · [Plano](planos/f20-equipe-permissoes.md). Onda 4. Dependências: G00, F09. Decisões: D22 matriz owner/editor/leitor, prazo de convite e transferência de dono.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F20-S0 | NÃO INICIADA | F42 (prioridade), F09 | [Escopo contratos e reuso](planos/f20-equipe-permissoes.md#f20-s0-escopo-contratos-e-revisão-de-reutilização) |
| F20-S1 | NÃO INICIADA | F20-S0 | [Testes U e C](planos/f20-equipe-permissoes.md#f20-s1-testes-unitários-e-componentes-antes-da-regra) |
| F20-S2 | NÃO INICIADA | F20-S1 | [Dados e migração](planos/f20-equipe-permissoes.md#f20-s2-dados-invariantes-e-migração) |
| F20-S3 | NÃO INICIADA | F20-S2 | [Domínio API e jobs](planos/f20-equipe-permissoes.md#f20-s3-regra-de-negócio-api-e-jobs) |
| F20-S4 | NÃO INICIADA | F20-S3 | [Interface](planos/f20-equipe-permissoes.md#f20-s4-interface-composição-e-estados) |
| F20-S5 | NÃO INICIADA | F20-S4 | [Integração e ACs](planos/f20-equipe-permissoes.md#f20-s5-integração-contrato-persistência-e-falhas) |
| F20-S6 | NÃO INICIADA | F20-S5 | [Playwright e QA](planos/f20-equipe-permissoes.md#f20-s6-e2e-playwright-e-revisão-visual) |
| F20-S7 | NÃO INICIADA | F20-S6 | [Regressão e liberação](planos/f20-equipe-permissoes.md#f20-s7-regressão-rollout-e-fechamento-auditável) |

### 26 F21 Mídia kit do divulgador

[Spec](specs/f21-midia-kit.md) · [Plano](planos/f21-midia-kit.md). Onda 4. Dependências: G00, F09, F01. Decisões: D23 métricas permitidas, frequência de atualização e compartilhamento de contato.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F21-S0 | NÃO INICIADA | F42 (prioridade), F09, F01 | [Escopo contratos e reuso](planos/f21-midia-kit.md#f21-s0-escopo-contratos-e-revisão-de-reutilização) |
| F21-S1 | NÃO INICIADA | F21-S0 | [Testes U e C](planos/f21-midia-kit.md#f21-s1-testes-unitários-e-componentes-antes-da-regra) |
| F21-S2 | NÃO INICIADA | F21-S1 | [Dados e migração](planos/f21-midia-kit.md#f21-s2-dados-invariantes-e-migração) |
| F21-S3 | NÃO INICIADA | F21-S2 | [Domínio API e jobs](planos/f21-midia-kit.md#f21-s3-regra-de-negócio-api-e-jobs) |
| F21-S4 | NÃO INICIADA | F21-S3 | [Interface](planos/f21-midia-kit.md#f21-s4-interface-composição-e-estados) |
| F21-S5 | NÃO INICIADA | F21-S4 | [Integração e ACs](planos/f21-midia-kit.md#f21-s5-integração-contrato-persistência-e-falhas) |
| F21-S6 | NÃO INICIADA | F21-S5 | [Playwright e QA](planos/f21-midia-kit.md#f21-s6-e2e-playwright-e-revisão-visual) |
| F21-S7 | NÃO INICIADA | F21-S6 | [Regressão e liberação](planos/f21-midia-kit.md#f21-s7-regressão-rollout-e-fechamento-auditável) |

### 27 F22 Formulário de contato na página

[Spec](specs/f22-formulario-contato.md) · [Plano](planos/f22-formulario-contato.md). Onda 4. Dependências: G00, F09, F20. Decisões: D24 retenção, exclusão, campos permitidos, destinatários e opt-in de novidades.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F22-S0 | NÃO INICIADA | F42 (prioridade), F09, F20 | [Escopo contratos e reuso](planos/f22-formulario-contato.md#f22-s0-escopo-contratos-e-revisão-de-reutilização) |
| F22-S1 | NÃO INICIADA | F22-S0 | [Testes U e C](planos/f22-formulario-contato.md#f22-s1-testes-unitários-e-componentes-antes-da-regra) |
| F22-S2 | NÃO INICIADA | F22-S1 | [Dados e migração](planos/f22-formulario-contato.md#f22-s2-dados-invariantes-e-migração) |
| F22-S3 | NÃO INICIADA | F22-S2 | [Domínio API e jobs](planos/f22-formulario-contato.md#f22-s3-regra-de-negócio-api-e-jobs) |
| F22-S4 | NÃO INICIADA | F22-S3 | [Interface](planos/f22-formulario-contato.md#f22-s4-interface-composição-e-estados) |
| F22-S5 | NÃO INICIADA | F22-S4 | [Integração e ACs](planos/f22-formulario-contato.md#f22-s5-integração-contrato-persistência-e-falhas) |
| F22-S6 | NÃO INICIADA | F22-S5 | [Playwright e QA](planos/f22-formulario-contato.md#f22-s6-e2e-playwright-e-revisão-visual) |
| F22-S7 | NÃO INICIADA | F22-S6 | [Regressão e liberação](planos/f22-formulario-contato.md#f22-s7-regressão-rollout-e-fechamento-auditável) |

### 28 F23 Distribuidor de convites

[Spec](specs/f23-distribuidor-convites.md) · [Plano](planos/f23-distribuidor-convites.md). Onda 4. Dependências: G00, F12. Decisões: D25 round-robin ponderado, limites e fallback quando destino fica indisponível.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F23-S0 | NÃO INICIADA | F42 (prioridade), F12 | [Escopo contratos e reuso](planos/f23-distribuidor-convites.md#f23-s0-escopo-contratos-e-revisão-de-reutilização) |
| F23-S1 | NÃO INICIADA | F23-S0 | [Testes U e C](planos/f23-distribuidor-convites.md#f23-s1-testes-unitários-e-componentes-antes-da-regra) |
| F23-S2 | NÃO INICIADA | F23-S1 | [Dados e migração](planos/f23-distribuidor-convites.md#f23-s2-dados-invariantes-e-migração) |
| F23-S3 | NÃO INICIADA | F23-S2 | [Domínio API e jobs](planos/f23-distribuidor-convites.md#f23-s3-regra-de-negócio-api-e-jobs) |
| F23-S4 | NÃO INICIADA | F23-S3 | [Interface](planos/f23-distribuidor-convites.md#f23-s4-interface-composição-e-estados) |
| F23-S5 | NÃO INICIADA | F23-S4 | [Integração e ACs](planos/f23-distribuidor-convites.md#f23-s5-integração-contrato-persistência-e-falhas) |
| F23-S6 | NÃO INICIADA | F23-S5 | [Playwright e QA](planos/f23-distribuidor-convites.md#f23-s6-e2e-playwright-e-revisão-visual) |
| F23-S7 | NÃO INICIADA | F23-S6 | [Regressão e liberação](planos/f23-distribuidor-convites.md#f23-s7-regressão-rollout-e-fechamento-auditável) |

### 29 F25 Assistente de criação de perfil

[Spec](specs/f25-assistente-perfil.md) · [Plano](planos/f25-assistente-perfil.md). Onda 4. Dependências: G00, F09, F16, F17. Decisões: D27 provedor/modelo, orçamento, política de dados e validação de fatos; seleção externa antes de integrar.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F25-S0 | NÃO INICIADA | F42 (prioridade), F09, F16, F17 | [Escopo contratos e reuso](planos/f25-assistente-perfil.md#f25-s0-escopo-contratos-e-revisão-de-reutilização) |
| F25-S1 | NÃO INICIADA | F25-S0 | [Testes U e C](planos/f25-assistente-perfil.md#f25-s1-testes-unitários-e-componentes-antes-da-regra) |
| F25-S2 | NÃO INICIADA | F25-S1 | [Dados e migração](planos/f25-assistente-perfil.md#f25-s2-dados-invariantes-e-migração) |
| F25-S3 | NÃO INICIADA | F25-S2 | [Domínio API e jobs](planos/f25-assistente-perfil.md#f25-s3-regra-de-negócio-api-e-jobs) |
| F25-S4 | NÃO INICIADA | F25-S3 | [Interface](planos/f25-assistente-perfil.md#f25-s4-interface-composição-e-estados) |
| F25-S5 | NÃO INICIADA | F25-S4 | [Integração e ACs](planos/f25-assistente-perfil.md#f25-s5-integração-contrato-persistência-e-falhas) |
| F25-S6 | NÃO INICIADA | F25-S5 | [Playwright e QA](planos/f25-assistente-perfil.md#f25-s6-e2e-playwright-e-revisão-visual) |
| F25-S7 | NÃO INICIADA | F25-S6 | [Regressão e liberação](planos/f25-assistente-perfil.md#f25-s7-regressão-rollout-e-fechamento-auditável) |

### 30 F28 Comprovação de propriedade

[Spec](specs/f28-comprovacao-propriedade.md) · [Plano](planos/f28-comprovacao-propriedade.md). Onda 4. Dependências: G00, F12. Decisões: D30 métodos viáveis por rede, validade, revalidação e retenção da evidência.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F28-S0 | NÃO INICIADA | F42 (prioridade), F12 | [Escopo contratos e reuso](planos/f28-comprovacao-propriedade.md#f28-s0-escopo-contratos-e-revisão-de-reutilização) |
| F28-S1 | NÃO INICIADA | F28-S0 | [Testes U e C](planos/f28-comprovacao-propriedade.md#f28-s1-testes-unitários-e-componentes-antes-da-regra) |
| F28-S2 | NÃO INICIADA | F28-S1 | [Dados e migração](planos/f28-comprovacao-propriedade.md#f28-s2-dados-invariantes-e-migração) |
| F28-S3 | NÃO INICIADA | F28-S2 | [Domínio API e jobs](planos/f28-comprovacao-propriedade.md#f28-s3-regra-de-negócio-api-e-jobs) |
| F28-S4 | NÃO INICIADA | F28-S3 | [Interface](planos/f28-comprovacao-propriedade.md#f28-s4-interface-composição-e-estados) |
| F28-S5 | NÃO INICIADA | F28-S4 | [Integração e ACs](planos/f28-comprovacao-propriedade.md#f28-s5-integração-contrato-persistência-e-falhas) |
| F28-S6 | NÃO INICIADA | F28-S5 | [Playwright e QA](planos/f28-comprovacao-propriedade.md#f28-s6-e2e-playwright-e-revisão-visual) |
| F28-S7 | NÃO INICIADA | F28-S6 | [Regressão e liberação](planos/f28-comprovacao-propriedade.md#f28-s7-regressão-rollout-e-fechamento-auditável) |

### 31 F29 Página de evento

[Spec](specs/f29-evento.md) · [Plano](planos/f29-evento.md). Onda 4. Dependências: G00, F09, F14. Decisões: D31 modelo de evento, política ICS para remarcação e inscrições externas.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F29-S0 | NÃO INICIADA | F42 (prioridade), F09, F14 | [Escopo contratos e reuso](planos/f29-evento.md#f29-s0-escopo-contratos-e-revisão-de-reutilização) |
| F29-S1 | NÃO INICIADA | F29-S0 | [Testes U e C](planos/f29-evento.md#f29-s1-testes-unitários-e-componentes-antes-da-regra) |
| F29-S2 | NÃO INICIADA | F29-S1 | [Dados e migração](planos/f29-evento.md#f29-s2-dados-invariantes-e-migração) |
| F29-S3 | NÃO INICIADA | F29-S2 | [Domínio API e jobs](planos/f29-evento.md#f29-s3-regra-de-negócio-api-e-jobs) |
| F29-S4 | NÃO INICIADA | F29-S3 | [Interface](planos/f29-evento.md#f29-s4-interface-composição-e-estados) |
| F29-S5 | NÃO INICIADA | F29-S4 | [Integração e ACs](planos/f29-evento.md#f29-s5-integração-contrato-persistência-e-falhas) |
| F29-S6 | NÃO INICIADA | F29-S5 | [Playwright e QA](planos/f29-evento.md#f29-s6-e2e-playwright-e-revisão-visual) |
| F29-S7 | NÃO INICIADA | F29-S6 | [Regressão e liberação](planos/f29-evento.md#f29-s7-regressão-rollout-e-fechamento-auditável) |

### 32 F32 Kit de divulgação

[Spec](specs/f32-kit-divulgacao.md) · [Plano](planos/f32-kit-divulgacao.md). Onda 4. Dependências: G00, F09, F13. Decisões: D34 formatos, dimensões, fontes, limite de texto e mecanismo de render suportado.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F32-S0 | NÃO INICIADA | F42 (prioridade), F09, F13 | [Escopo contratos e reuso](planos/f32-kit-divulgacao.md#f32-s0-escopo-contratos-e-revisão-de-reutilização) |
| F32-S1 | NÃO INICIADA | F32-S0 | [Testes U e C](planos/f32-kit-divulgacao.md#f32-s1-testes-unitários-e-componentes-antes-da-regra) |
| F32-S2 | NÃO INICIADA | F32-S1 | [Dados e migração](planos/f32-kit-divulgacao.md#f32-s2-dados-invariantes-e-migração) |
| F32-S3 | NÃO INICIADA | F32-S2 | [Domínio API e jobs](planos/f32-kit-divulgacao.md#f32-s3-regra-de-negócio-api-e-jobs) |
| F32-S4 | NÃO INICIADA | F32-S3 | [Interface](planos/f32-kit-divulgacao.md#f32-s4-interface-composição-e-estados) |
| F32-S5 | NÃO INICIADA | F32-S4 | [Integração e ACs](planos/f32-kit-divulgacao.md#f32-s5-integração-contrato-persistência-e-falhas) |
| F32-S6 | NÃO INICIADA | F32-S5 | [Playwright e QA](planos/f32-kit-divulgacao.md#f32-s6-e2e-playwright-e-revisão-visual) |
| F32-S7 | NÃO INICIADA | F32-S6 | [Regressão e liberação](planos/f32-kit-divulgacao.md#f32-s7-regressão-rollout-e-fechamento-auditável) |

### 33 F33 Coleções públicas compartilháveis

[Spec](specs/f33-colecoes-publicas.md) · [Plano](planos/f33-colecoes-publicas.md). Onda 4. Dependências: G00, F04. Decisões: D35 coleção pode incluir item indisponível como aviso sem destino, slug e tratamento de conteúdo restrito.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F33-S0 | NÃO INICIADA | F42 (prioridade), F04 | [Escopo contratos e reuso](planos/f33-colecoes-publicas.md#f33-s0-escopo-contratos-e-revisão-de-reutilização) |
| F33-S1 | NÃO INICIADA | F33-S0 | [Testes U e C](planos/f33-colecoes-publicas.md#f33-s1-testes-unitários-e-componentes-antes-da-regra) |
| F33-S2 | NÃO INICIADA | F33-S1 | [Dados e migração](planos/f33-colecoes-publicas.md#f33-s2-dados-invariantes-e-migração) |
| F33-S3 | NÃO INICIADA | F33-S2 | [Domínio API e jobs](planos/f33-colecoes-publicas.md#f33-s3-regra-de-negócio-api-e-jobs) |
| F33-S4 | NÃO INICIADA | F33-S3 | [Interface](planos/f33-colecoes-publicas.md#f33-s4-interface-composição-e-estados) |
| F33-S5 | NÃO INICIADA | F33-S4 | [Integração e ACs](planos/f33-colecoes-publicas.md#f33-s5-integração-contrato-persistência-e-falhas) |
| F33-S6 | NÃO INICIADA | F33-S5 | [Playwright e QA](planos/f33-colecoes-publicas.md#f33-s6-e2e-playwright-e-revisão-visual) |
| F33-S7 | NÃO INICIADA | F33-S6 | [Regressão e liberação](planos/f33-colecoes-publicas.md#f33-s7-regressão-rollout-e-fechamento-auditável) |

### 34 F10 Página premium com subdomínio

[Spec](specs/f10-pagina-premium-subdominio.md) · [Plano](planos/f10-pagina-premium-subdominio.md). Onda 5. Dependências: G00, F09, F11, F19, F16. Decisões: D11 DNS/TLS wildcard e origens confiáveis; D12 inadimplência, cancelamento, reserva e redirecionamento de host.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F10-S0 | NÃO INICIADA | F42 (prioridade), F09, F11, F19, F16 | [Escopo contratos e reuso](planos/f10-pagina-premium-subdominio.md#f10-s0-escopo-contratos-e-revisão-de-reutilização) |
| F10-S1 | NÃO INICIADA | F10-S0 | [Testes U e C](planos/f10-pagina-premium-subdominio.md#f10-s1-testes-unitários-e-componentes-antes-da-regra) |
| F10-S2 | NÃO INICIADA | F10-S1 | [Dados e migração](planos/f10-pagina-premium-subdominio.md#f10-s2-dados-invariantes-e-migração) |
| F10-S3 | NÃO INICIADA | F10-S2 | [Domínio API e jobs](planos/f10-pagina-premium-subdominio.md#f10-s3-regra-de-negócio-api-e-jobs) |
| F10-S4 | NÃO INICIADA | F10-S3 | [Interface](planos/f10-pagina-premium-subdominio.md#f10-s4-interface-composição-e-estados) |
| F10-S5 | NÃO INICIADA | F10-S4 | [Integração e ACs](planos/f10-pagina-premium-subdominio.md#f10-s5-integração-contrato-persistência-e-falhas) |
| F10-S6 | NÃO INICIADA | F10-S5 | [Playwright e QA](planos/f10-pagina-premium-subdominio.md#f10-s6-e2e-playwright-e-revisão-visual) |
| F10-S7 | NÃO INICIADA | F10-S6 | [Regressão e liberação](planos/f10-pagina-premium-subdominio.md#f10-s7-regressão-rollout-e-fechamento-auditável) |

### 35 F24 Descoberta de perfis

[Spec](specs/f24-descoberta-perfis.md) · [Plano](planos/f24-descoberta-perfis.md). Onda 5. Dependências: G00, F09, F03. Decisões: D26 elegibilidade mínima, ranking, limites e conteúdo com restrição.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F24-S0 | NÃO INICIADA | F42 (prioridade), F09, F03 | [Escopo contratos e reuso](planos/f24-descoberta-perfis.md#f24-s0-escopo-contratos-e-revisão-de-reutilização) |
| F24-S1 | NÃO INICIADA | F24-S0 | [Testes U e C](planos/f24-descoberta-perfis.md#f24-s1-testes-unitários-e-componentes-antes-da-regra) |
| F24-S2 | NÃO INICIADA | F24-S1 | [Dados e migração](planos/f24-descoberta-perfis.md#f24-s2-dados-invariantes-e-migração) |
| F24-S3 | NÃO INICIADA | F24-S2 | [Domínio API e jobs](planos/f24-descoberta-perfis.md#f24-s3-regra-de-negócio-api-e-jobs) |
| F24-S4 | NÃO INICIADA | F24-S3 | [Interface](planos/f24-descoberta-perfis.md#f24-s4-interface-composição-e-estados) |
| F24-S5 | NÃO INICIADA | F24-S4 | [Integração e ACs](planos/f24-descoberta-perfis.md#f24-s5-integração-contrato-persistência-e-falhas) |
| F24-S6 | NÃO INICIADA | F24-S5 | [Playwright e QA](planos/f24-descoberta-perfis.md#f24-s6-e2e-playwright-e-revisão-visual) |
| F24-S7 | NÃO INICIADA | F24-S6 | [Regressão e liberação](planos/f24-descoberta-perfis.md#f24-s7-regressão-rollout-e-fechamento-auditável) |

### 36 F30 Integrações e avisos automáticos

[Spec](specs/f30-integracoes-webhooks.md) · [Plano](planos/f30-integracoes-webhooks.md). Onda 5. Dependências: G00, F22, F02. Decisões: D32 tipos de eventos, retry/backoff/retencão, rotação e política de saída de dados.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F30-S0 | NÃO INICIADA | F42 (prioridade), F22, F02 | [Escopo contratos e reuso](planos/f30-integracoes-webhooks.md#f30-s0-escopo-contratos-e-revisão-de-reutilização) |
| F30-S1 | NÃO INICIADA | F30-S0 | [Testes U e C](planos/f30-integracoes-webhooks.md#f30-s1-testes-unitários-e-componentes-antes-da-regra) |
| F30-S2 | NÃO INICIADA | F30-S1 | [Dados e migração](planos/f30-integracoes-webhooks.md#f30-s2-dados-invariantes-e-migração) |
| F30-S3 | NÃO INICIADA | F30-S2 | [Domínio API e jobs](planos/f30-integracoes-webhooks.md#f30-s3-regra-de-negócio-api-e-jobs) |
| F30-S4 | NÃO INICIADA | F30-S3 | [Interface](planos/f30-integracoes-webhooks.md#f30-s4-interface-composição-e-estados) |
| F30-S5 | NÃO INICIADA | F30-S4 | [Integração e ACs](planos/f30-integracoes-webhooks.md#f30-s5-integração-contrato-persistência-e-falhas) |
| F30-S6 | NÃO INICIADA | F30-S5 | [Playwright e QA](planos/f30-integracoes-webhooks.md#f30-s6-e2e-playwright-e-revisão-visual) |
| F30-S7 | NÃO INICIADA | F30-S6 | [Regressão e liberação](planos/f30-integracoes-webhooks.md#f30-s7-regressão-rollout-e-fechamento-auditável) |

### 37 F35 Central de contatos recebidos

[Spec](specs/f35-central-contatos.md) · [Plano](planos/f35-central-contatos.md). Onda 5. Dependências: G00, F22, F20. Decisões: D37 transições/reabertura, retenção e papéis que podem exportar/excluir.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F35-S0 | NÃO INICIADA | F42 (prioridade), F22, F20 | [Escopo contratos e reuso](planos/f35-central-contatos.md#f35-s0-escopo-contratos-e-revisão-de-reutilização) |
| F35-S1 | NÃO INICIADA | F35-S0 | [Testes U e C](planos/f35-central-contatos.md#f35-s1-testes-unitários-e-componentes-antes-da-regra) |
| F35-S2 | NÃO INICIADA | F35-S1 | [Dados e migração](planos/f35-central-contatos.md#f35-s2-dados-invariantes-e-migração) |
| F35-S3 | NÃO INICIADA | F35-S2 | [Domínio API e jobs](planos/f35-central-contatos.md#f35-s3-regra-de-negócio-api-e-jobs) |
| F35-S4 | NÃO INICIADA | F35-S3 | [Interface](planos/f35-central-contatos.md#f35-s4-interface-composição-e-estados) |
| F35-S5 | NÃO INICIADA | F35-S4 | [Integração e ACs](planos/f35-central-contatos.md#f35-s5-integração-contrato-persistência-e-falhas) |
| F35-S6 | NÃO INICIADA | F35-S5 | [Playwright e QA](planos/f35-central-contatos.md#f35-s6-e2e-playwright-e-revisão-visual) |
| F35-S7 | NÃO INICIADA | F35-S6 | [Regressão e liberação](planos/f35-central-contatos.md#f35-s7-regressão-rollout-e-fechamento-auditável) |

### 38 F39 Página em vários idiomas

[Spec](specs/f39-multilingue.md) · [Plano](planos/f39-multilingue.md). Onda 5. Dependências: G00, F09, F19. Decisões: D41 idiomas, URL canônica, fallback e regras para destino por idioma.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F39-S0 | NÃO INICIADA | F42 (prioridade), F09, F19 | [Escopo contratos e reuso](planos/f39-multilingue.md#f39-s0-escopo-contratos-e-revisão-de-reutilização) |
| F39-S1 | NÃO INICIADA | F39-S0 | [Testes U e C](planos/f39-multilingue.md#f39-s1-testes-unitários-e-componentes-antes-da-regra) |
| F39-S2 | NÃO INICIADA | F39-S1 | [Dados e migração](planos/f39-multilingue.md#f39-s2-dados-invariantes-e-migração) |
| F39-S3 | NÃO INICIADA | F39-S2 | [Domínio API e jobs](planos/f39-multilingue.md#f39-s3-regra-de-negócio-api-e-jobs) |
| F39-S4 | NÃO INICIADA | F39-S3 | [Interface](planos/f39-multilingue.md#f39-s4-interface-composição-e-estados) |
| F39-S5 | NÃO INICIADA | F39-S4 | [Integração e ACs](planos/f39-multilingue.md#f39-s5-integração-contrato-persistência-e-falhas) |
| F39-S6 | NÃO INICIADA | F39-S5 | [Playwright e QA](planos/f39-multilingue.md#f39-s6-e2e-playwright-e-revisão-visual) |
| F39-S7 | NÃO INICIADA | F39-S6 | [Regressão e liberação](planos/f39-multilingue.md#f39-s7-regressão-rollout-e-fechamento-auditável) |

### 39 F26 Teste de versões de botões

[Spec](specs/f26-teste-botoes.md) · [Plano](planos/f26-teste-botoes.md). Onda 6. Dependências: G00, F09, F31. Decisões: D28 objetivo, amostra, efeito mínimo, confiança, horizonte e consentimento.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F26-S0 | NÃO INICIADA | F42 (prioridade), F09, F31 | [Escopo contratos e reuso](planos/f26-teste-botoes.md#f26-s0-escopo-contratos-e-revisão-de-reutilização) |
| F26-S1 | NÃO INICIADA | F26-S0 | [Testes U e C](planos/f26-teste-botoes.md#f26-s1-testes-unitários-e-componentes-antes-da-regra) |
| F26-S2 | NÃO INICIADA | F26-S1 | [Dados e migração](planos/f26-teste-botoes.md#f26-s2-dados-invariantes-e-migração) |
| F26-S3 | NÃO INICIADA | F26-S2 | [Domínio API e jobs](planos/f26-teste-botoes.md#f26-s3-regra-de-negócio-api-e-jobs) |
| F26-S4 | NÃO INICIADA | F26-S3 | [Interface](planos/f26-teste-botoes.md#f26-s4-interface-composição-e-estados) |
| F26-S5 | NÃO INICIADA | F26-S4 | [Integração e ACs](planos/f26-teste-botoes.md#f26-s5-integração-contrato-persistência-e-falhas) |
| F26-S6 | NÃO INICIADA | F26-S5 | [Playwright e QA](planos/f26-teste-botoes.md#f26-s6-e2e-playwright-e-revisão-visual) |
| F26-S7 | NÃO INICIADA | F26-S6 | [Regressão e liberação](planos/f26-teste-botoes.md#f26-s7-regressão-rollout-e-fechamento-auditável) |

### 40 F36 Pacotes para agências

[Spec](specs/f36-agencias.md) · [Plano](planos/f36-agencias.md). Onda 6. Dependências: G00, F20, F11, F21. Decisões: D38 limites/preços, vínculo de cobrança, consentimento e procedimento de transferência.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F36-S0 | NÃO INICIADA | F42 (prioridade), F20, F11, F21 | [Escopo contratos e reuso](planos/f36-agencias.md#f36-s0-escopo-contratos-e-revisão-de-reutilização) |
| F36-S1 | NÃO INICIADA | F36-S0 | [Testes U e C](planos/f36-agencias.md#f36-s1-testes-unitários-e-componentes-antes-da-regra) |
| F36-S2 | NÃO INICIADA | F36-S1 | [Dados e migração](planos/f36-agencias.md#f36-s2-dados-invariantes-e-migração) |
| F36-S3 | NÃO INICIADA | F36-S2 | [Domínio API e jobs](planos/f36-agencias.md#f36-s3-regra-de-negócio-api-e-jobs) |
| F36-S4 | NÃO INICIADA | F36-S3 | [Interface](planos/f36-agencias.md#f36-s4-interface-composição-e-estados) |
| F36-S5 | NÃO INICIADA | F36-S4 | [Integração e ACs](planos/f36-agencias.md#f36-s5-integração-contrato-persistência-e-falhas) |
| F36-S6 | NÃO INICIADA | F36-S5 | [Playwright e QA](planos/f36-agencias.md#f36-s6-e2e-playwright-e-revisão-visual) |
| F36-S7 | NÃO INICIADA | F36-S6 | [Regressão e liberação](planos/f36-agencias.md#f36-s7-regressão-rollout-e-fechamento-auditável) |

### 41 F40 Diagnóstico da página

[Spec](specs/f40-diagnostico.md) · [Plano](planos/f40-diagnostico.md). Onda 6. Dependências: G00, F09, F07, F31. Decisões: D42 limiares, catálogo de regras, janela e validade de descarte.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F40-S0 | NÃO INICIADA | F42 (prioridade), F09, F07, F31 | [Escopo contratos e reuso](planos/f40-diagnostico.md#f40-s0-escopo-contratos-e-revisão-de-reutilização) |
| F40-S1 | NÃO INICIADA | F40-S0 | [Testes U e C](planos/f40-diagnostico.md#f40-s1-testes-unitários-e-componentes-antes-da-regra) |
| F40-S2 | NÃO INICIADA | F40-S1 | [Dados e migração](planos/f40-diagnostico.md#f40-s2-dados-invariantes-e-migração) |
| F40-S3 | NÃO INICIADA | F40-S2 | [Domínio API e jobs](planos/f40-diagnostico.md#f40-s3-regra-de-negócio-api-e-jobs) |
| F40-S4 | NÃO INICIADA | F40-S3 | [Interface](planos/f40-diagnostico.md#f40-s4-interface-composição-e-estados) |
| F40-S5 | NÃO INICIADA | F40-S4 | [Integração e ACs](planos/f40-diagnostico.md#f40-s5-integração-contrato-persistência-e-falhas) |
| F40-S6 | NÃO INICIADA | F40-S5 | [Playwright e QA](planos/f40-diagnostico.md#f40-s6-e2e-playwright-e-revisão-visual) |
| F40-S7 | NÃO INICIADA | F40-S6 | [Regressão e liberação](planos/f40-diagnostico.md#f40-s7-regressão-rollout-e-fechamento-auditável) |

### 42 F41 App instalável

[Spec](specs/f41-pwa.md) · [Plano](planos/f41-pwa.md). Onda 6. Dependências: G00, F09. Decisões: D43 navegadores/dispositivos suportados, cache e política de atualização.

| Etapa | Estado | Pré-requisito imediato | Entregável a verificar |
| --- | --- | --- | --- |
| F41-S0 | NÃO INICIADA | F42 (prioridade), F09 | [Escopo contratos e reuso](planos/f41-pwa.md#f41-s0-escopo-contratos-e-revisão-de-reutilização) |
| F41-S1 | NÃO INICIADA | F41-S0 | [Testes U e C](planos/f41-pwa.md#f41-s1-testes-unitários-e-componentes-antes-da-regra) |
| F41-S2 | NÃO INICIADA | F41-S1 | [Dados e migração](planos/f41-pwa.md#f41-s2-dados-invariantes-e-migração) |
| F41-S3 | NÃO INICIADA | F41-S2 | [Domínio API e jobs](planos/f41-pwa.md#f41-s3-regra-de-negócio-api-e-jobs) |
| F41-S4 | NÃO INICIADA | F41-S3 | [Interface](planos/f41-pwa.md#f41-s4-interface-composição-e-estados) |
| F41-S5 | NÃO INICIADA | F41-S4 | [Integração e ACs](planos/f41-pwa.md#f41-s5-integração-contrato-persistência-e-falhas) |
| F41-S6 | NÃO INICIADA | F41-S5 | [Playwright e QA](planos/f41-pwa.md#f41-s6-e2e-playwright-e-revisão-visual) |
| F41-S7 | NÃO INICIADA | F41-S6 | [Regressão e liberação](planos/f41-pwa.md#f41-s7-regressão-rollout-e-fechamento-auditável) |


## Auditoria de mudança

Ao iniciar uma feature, copiar os critérios para o relatório de execução sem perder seus IDs. Qualquer critério adicionado recebe próximo número livre; critério substituído mantém registro e vínculo da substituição. Não renumerar AC/T em alterações posteriores da fonte.

Antes de encerrar S7: conferir ACs sem resultado, testes ignorados, decisões pendentes, regressões quebradas e evidências ausentes. Qualquer um desses itens impede a conclusão. Não chamar uma feature de entregue quando só sua spec está pronta.


F07: contratos e evidências em [execução F07](execucao-f07.md). Encerrar após o fechamento desta feature, conforme instrução posterior do usuário; não iniciar F02.

16/10/2026: F02 executada após nova autorização; encerrar ao concluí-la. Ver [execução F02](execucao-f02.md).

F02 concluída na branch: S0–S7 e AC01–AC05 aprovados; CI 38909863096. Parada após esta feature, sem implantação.


## 17/10/2026 — extensão visual/funcional de F09, sem avanço do roadmap

Pedido posterior autorizou página pessoal inteira e personalização. O lote usa a F09 existente, mantém regras de publicação/moderação e não inicia F19. Contratos e checklist em [Minha página](../frontend-profissional/minha-pagina-personalizacao.md); resultados no registro F09 e implementação do frontend. Etapas S0–S7 históricas e seus commits não são reatribuídos: esta extensão permanece local, com validação própria e sem commit/CI/deploy novo.


## 17/10/2026 — marca discreta e revisão de páginas/convites

Autorização específica posterior: assinatura pequena e ciclo IA → aprovação automática ou humano → recusa/contestação para F09/F12. Implementação local versionada por envio, sem consumir quotas de Link. [Registro e critérios](../frontend-profissional/revisao-paginas-convites.md) descrevem reuso, testes, migração e reversão. Sem avanço de ordem, nova feature, commit, push ou deploy; fases históricas e seus CI permanecem históricos.

## Extensão de 17/10/2026 — páginas e convites no WhatsApp

Por novo pedido expresso, revisões humanas de F09/F12 e suas contestações também usam o grupo Evolution configurado, a mesma autorização por operador ADMIN e a mesma operação de decisão do painel. O aviso citado identifica a versão exata; expiração, substituição e contestação invalidam mensagens anteriores. Decisão e registro do aviso de confirmação são atômicos, sem alterar aprovação automática, regras de segurança ou cobrança. Avisos ganham símbolos distintos por evento e mantêm seções curtas.

Contrato, critérios, limites, evidências e resultados no [complemento da implementação](../frontend-profissional/revisao-paginas-convites.md#complemento-autorizado--aprovação-pelo-whatsapp).
