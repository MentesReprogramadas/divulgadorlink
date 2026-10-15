---
name: temlink-ui-validation
description: Validar uma alteração do frontend Tem Link Aqui no navegador real, cobrindo acessibilidade, estados, jornada funcional e regressão visual antes de ampliar a migração.
---

# Validação de UI

Ler AGENTS.md e docs/frontend-profissional/piloto-e-qualidade.md. Esta Skill verifica evidências e pode corrigir falhas dentro da fatia autorizada; não aprova uma nova direção de produto por conta própria.

## Procedimento

- Confirmar ambiente de teste, dados, tenant, sessão, portas e efeitos do setup antes de executar a jornada. Não usar produção ou serviços de envio/cobrança reais.
- Inspecionar DOM, estilos, console e rede pelo Chrome DevTools ou navegador equivalente. Escolher um controlador por sessão e registrar browser/viewport. Emulação mobile não é teste de aparelho físico.
- Verificar desktop e mobile, teclado, foco, zoom, contraste e estados aplicáveis. Comparar implementação com o alvo aprovado e não apenas com a tela antiga.
- Executar os checks da etapa. Para a jornada, usar Playwright Test existente; para visual, usar screenshots determinísticos e examinar expected/actual/diff. Atualizar baseline somente após revisão do novo alvo.
- Não mascarar regiões alteradas nem aumentar tolerâncias para silenciar regressões. Inspecionar falhas de forma causal, sem alterar contratos antigos para obter verde.
- Entregar matriz de resultado por estado e viewport, capturas, comandos/resultados, problemas corrigidos e limitações. Separar teste executado, teste planejado e teste bloqueado.
- Declarar a fatia pronta somente quando os critérios aplicáveis estiverem satisfeitos. Seguir a autorização vigente no AGENTS; com a migração completa autorizada, validar tecnicamente cada lote e avançar sem pedir novamente a mesma aprovação.
