---
name: temlink-ui-audit
description: Auditar a UI e a arquitetura do frontend Tem Link Aqui, identificando responsabilidades, duplicações, riscos de produto e lacunas de estados antes de propor mudanças.
---

# Auditoria de UI e arquitetura

Ler AGENTS.md da raiz e docs/frontend-profissional/README.md para contratos e escopo. Esta Skill produz diagnóstico e backlog; não implementa o redesenho.

## Procedimento

- Identificar a rota efetiva e sua árvore de componentes, dados, sessão, tenant, metadados e eventos. Confirmar uso por imports, não pelo nome de arquivos.
- Confrontar testes, histórico e especificação. Classificar cada regra como observada, documentada, divergente ou proposta; não inventar qual configuração está ativa em produção.
- Inspecionar a interface renderizada quando houver acesso; registrar viewport, estado e evidência. Sem navegador, limitar conclusões a auditoria de código.
- Avaliar separação de responsabilidades, acoplamento, duplicação e estados ausentes. Distinguir tamanho de arquivo de uma responsabilidade realmente mal definida.
- Para cada achado, entregar evidência, impacto no usuário/negócio, severidade, correção sugerida e teste de aceite. Priorizar bloqueios de tarefa e acessibilidade antes de decoração.
- Produzir matriz rota × público × tarefa × regra × estado × risco, seguida de etapas pequenas com dependências. Usar docs/frontend-profissional/arquitetura.md como alvo, sem mover arquivos para satisfazer a árvore.

Encaminhar escolhas visuais para temlink-visual-direction e implementação aprovada para temlink-components. Não repetir aqui as proteções comerciais do AGENTS.
