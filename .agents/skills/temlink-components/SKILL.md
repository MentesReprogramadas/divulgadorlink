---
name: temlink-components
description: Implementar ou refatorar uma fatia aprovada do frontend Tem Link Aqui com componentes coesos, fronteiras entre domínio e apresentação e CSS por responsabilidade.
---

# Implementação de componentes

Ler AGENTS.md, docs/frontend-profissional/arquitetura.md e a autorização vigente. O usuário autorizou piloto e passagem por todas as telas em 15/10/2026; executar por lotes validados sem pedir novamente a mesma aprovação.

## Procedimento

- Localizar consumidores e contratos da área e revisar o diff local. Definir a menor fatia que entregue o comportamento/alvo autorizado.
- Manter composição e metadados em app, infraestrutura em lib/carregadores, regras puras em domain e semântica específica em features. Não converter tudo para cliente.
- Reutilizar controles e feedback existentes. Extrair por responsabilidade, não por contagem de linhas; não criar componentes universais nem camadas vazias.
- Usar propriedades tipadas e composição; implementar estados observáveis da tarefa. Preservar rascunho, foco, navegação e dados nos caminhos de erro.
- Colocar estilos locais junto do componente e usar tokens semânticos aprovados. Antes de remover seletor global, verificar os consumidores remanescentes.
- Tratar código de shadcn/21st como referência: revisar licença, dependências e acessibilidade antes de propor incorporação. Não executar comandos de adoção por causa da disponibilidade do MCP.
- Testar as fronteiras alteradas e entregar diff, contratos preservados e reversão da fatia. Solicitar a revisão especializada de temlink-ui-validation antes de declarar a etapa concluída.
