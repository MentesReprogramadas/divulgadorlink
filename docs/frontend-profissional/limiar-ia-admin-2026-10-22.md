# Limiar de aprovação da IA no admin — 22/10/2026

Pedido: publicar a alteração em `codex/roadmap-f37-testes`. O aviso com o motivo pertence ao WhatsApp.

## Comportamento

- `/admin/configuracoes` permite arrastar o limiar de 0 a 100%, ver o valor salvo e confirmar a mudança. Arrastar não grava. Falhas preservam o ajuste para nova tentativa; erro de leitura não assume zero.
- Reutiliza `MODERATION_AUTO_APPROVE_THRESHOLD`, persistido na escala de 0 a 1. Leitura exige administrador do tenant; escrita usa a rota existente e sua auditoria. Valores vazios ou fora da escala são rejeitados. Sem migration ou novo valor padrão.
- Em zero, dispensa o provedor de IA em novos links, propostas de texto, páginas, convites e coleções. Mantém blocklist, validação de destinos, autorização, verificação, suspensão e regras de publicação existentes. Não reprocessa decisões anteriores.
- Acima de zero, exige parecer positivo e confiança suficiente. Falha do provedor, parecer negativo ou baixa confiança mantêm o encaminhamento existente para revisão. Coleções não aprovadas permanecem privadas.
- Os avisos existentes de aprovação de links no WhatsApp mostram o motivo, as justificativas disponíveis, a confiança e o limiar daquela análise. Em zero, dizem “aprovado por configuração”, sem atribuir avaliação à IA.
- A não aprovação automática de novos links e textos produz um aviso informativo `AI_REVIEWED`. O aviso distingue revisão de recusa definitiva e preserva a mensagem acionável de revisão. Para texto recusado, mostra a proposta analisada; o conteúdo publicado anterior permanece.
- Usa o outbox, a integração e as proteções de entrega já existentes. Integração desligada continua sem entregar mensagens. Não adiciona notificações para superfícies que antes não tinham aviso de aprovação automática.

## Implementação e referências

Componente da feature com CSS Module, Button existente e range nativo. Sem dependências, novos ícones ou tokens. A [referência W3C para sliders](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) fundamenta nome acessível, percentual anunciado, setas, Home/End e foco. A seção e os tokens seguem o admin existente; Refero indisponível entre as ferramentas desta sessão.

A regra pura de IA passou para `domain/moderation/ai-verdict.ts`; o caminho anterior reexporta as funções para preservar consumidores. O grafo foi consultado antes da alteração e atualizado localmente por extração incremental de código, sem LLM ou envio externo. Os arquivos compartilhados do índice incluem outras mudanças locais e não integram este commit.

## Validação

Resultados e capturas locais: `output/ai-threshold-validation/`. PostgreSQL/Redis descartáveis próprios; nenhuma conexão com banco, OpenAI ou WhatsApp de produção. Playwright usa Next em build de produção e provedor Evolution local simulado.

- Snapshot do index, sem mudanças locais alheias: 41 testes de backend e 3 do componente aprovados. A divergência anterior de emoji no teste de notificações da árvore compartilhada não ocorre nesse snapshot.
- PostgreSQL: 5 testes específicos de limiar, publicação real, auditoria, outbox, proposta de texto e coleções; regressão de 65 testes de páginas, convites, coleções, notificações e worker de texto.
- Lint, typecheck e build dos dois pacotes. O build E2E inicial encerrou durante preparação; um build separado terminou e a jornada foi repetida.
- Playwright: 2 testes aprovados, desktop 1440×900 e mobile 390×844: gravação/releitura, auditoria, zero sem provedor, aviso de revisão por indisponibilidade, mensagens no stub, falha de transporte preservando ajuste, teclado, zoom de 200%, larguras 320/768/1280 e axe na seção alterada.
- Capturas zero/positivo inspecionadas. A inspeção inicial revelou seletor de texto alcançando o conteúdo do botão; corrigido para metadado filho direto. A captura final dispensa cookies pela ação real “Recusar” para permitir inspeção completa do controle.

Não é teste em aparelho físico nem certificação completa de acessibilidade. Não valida credenciais, entrega real do WhatsApp ou qualidade do modelo em produção. A alteração não foi implantada em produção.

## Escopo do Git e reversão

Somente arquivos desta tarefa foram preparados para commit; mudanças locais anteriores foram preservadas, inclusive em arquivos compartilhados. O teste E2E integra os projetos normais desktop/mobile e possui configuração específica para execução isolada: `npx playwright test --config playwright.moderation.config.ts` no frontend.

Para reverter a entrega, reverter seu commit. Isso não restaura valores já configurados no banco: o administrador deve ajustar o limiar separadamente. Nenhum valor de produção foi alterado nesta tarefa.
