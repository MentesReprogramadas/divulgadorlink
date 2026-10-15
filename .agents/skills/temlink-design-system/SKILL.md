---
name: temlink-design-system
description: Criar e manter tokens, variantes, padrões e documentação do Design System Tem Link Aqui a partir de uma direção visual validada, sem substituir bibliotecas automaticamente.
---

# Design System

Ler AGENTS.md, docs/frontend-profissional/design-system.md e a decisão visual da etapa. Este fluxo trata a linguagem compartilhada, não o carregamento ou autorização de uma feature.

## Procedimento

- Inventariar tokens e consumidores. Diferenciar primitivas de cor/escala, papéis semânticos e tokens de componente realmente necessários.
- Propor mudanças por função: texto, ação, status, foco, superfície, grid e densidade. Medir contraste das combinações efetivamente usadas.
- Introduzir aliases de compatibilidade e migrar um consumidor aprovado antes de remover nomes antigos. Não alterar todos os tokens globais para validar uma landing.
- Documentar cada componente com propósito, API, variantes, estados aplicáveis, teclado, responsividade e exemplos. Não criar variante sem uso real.
- Preservar diferenças úteis entre leitura, formulário, catálogo e operação, mantendo tipografia e ritmo coerentes. Não forçar a mesma largura ou card em todas as telas.
- Após validar o piloto, usar Storybook quando adotado para variantes e estados isolados, com mocks explícitos de infraestrutura. Registrar que stories não comprovam a integração do servidor.
- Entregar mapa de tokens, componentes/consumidores afetados, documentação e evidência visual. Encaminhar comportamento para temlink-components e revisão para temlink-ui-validation.
