# Plano F40 — Melhorar minha página

**Estado:** S0–S5 validados localmente; S6 em consolidação, S7 pendente. [Spec](../specs/f40-diagnostico.md), [execução/D42](../execucao-f40.md), [revisão de fluxos](../../frontend-profissional/revisao-fluxos-2026-10-21.md). Ordem 41. Novo pedido incluiu revisão/funcionamento da F40; não iniciar F41, commit, push ou deploy automaticamente.

## F40-S0 — Escopo e decisão

- [x] Confrontar fonte/AC01–05, grafo, fluxo de página, disponibilidade e métricas.
- [x] Registrar D42 com limiares, período, cobertura, descarte/validade e alternativas.
- [x] Confirmar que regra deriva de dados existentes e não exige novo provedor, preço ou quota.

## F40-S1 — Domínio e contrato

- [x] Regra pura v1 para títulos, organização, destino conhecido e interação.
- [x] Testar normalização, ocultos, amostra, taxa, revisão/ordem e ausência de métrica.
- [x] Definir DTO privado e estados de cobertura separados, sem dados pessoais ou destino privado no descarte.

## F40-S2 — Persistência e invariantes

- [x] Reutilizar AuditLog para descarte por chave/regra/ator/página; nenhum schema/migration novo.
- [x] Idempotência sob lock, validade de trinta dias, reavaliação por versão.
- [x] Limitar consulta a chaves atuais para não fazer sugestões ignoradas reaparecerem por limite arbitrário de leitura.

## F40-S3 — API e permissões

- [x] GET diagnostics e POST key/dismiss no módulo Profiles, com schema, BFF/CSRF e cache privado.
- [x] Aplicar page.read/write, legado READ/EDIT e reports.read separado no workspace global.
- [x] Validar período usando performanceRange existente e medição/cobertura F31; nenhum fetch externo.
- [x] Não alterar conteúdo/publicação/plano/medição por análise ou descarte.

## F40-S4 — Interface

- [x] Rota Melhorar minha página, integrada à navegação por contextos.
- [x] Ações à direita, filtros padronizados/imediatos, resumos e cards com motivo/evidência/ação.
- [x] Estados sem página, sem plano/permissão/dados, pausa, erro, recuperação e skeleton equivalente.
- [x] Período de São Paulo e teste de virada de dia UTC; nenhuma conversão causal de taxa.

## F40-S5 — PostgreSQL e falhas

- [x] Casos PG01–03 com dados reais: isolamento, regra/versão, idempotência, expiração, nenhum conteúdo alterado.
- [x] Cem impressões elegíveis, clique/ordem/publicação, período vazio, pausa e grants separados.
- [x] Consolidar regressões F34/F31/F35/F36/F24/F30 e testes unitários afetados.

## F40-S6 — Playwright e revisão visual

- [x] Registrar profile-diagnostics.spec.ts em features/features-mobile.
- [x] E01 motivo/ação/descarte/reload/versão e outro dono; E02 filtros, erro/recuperação e 320px.
- [x] Consolidar repetição final desktop/mobile, Axe, capturas e inspeção visual; registrar resultado efetivo na execução.

## F40-S7 — Fechamento e gate remoto

- [x] Finalizar documentação/roadmap/matriz, grafo incremental e checks locais da rodada.
- [ ] CI remoto, revisão/aceite final e ensaio de rollout/reversão em ambiente autorizado.
- [ ] Commit, push ou deploy somente por pedido específico. Nenhuma ação remota decorre de um plano marcado.

Reverter retirando entradas/rotas novas e mantendo auditoria/dados compatíveis; não resetar banco. Evidências por comando/ambiente no registro de execução. Checklist local não substitui o gate remoto.
