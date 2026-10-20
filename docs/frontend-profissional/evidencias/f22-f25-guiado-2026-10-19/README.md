# Validação local — 19/10/2026

Refinamento F22/F23/F25: [decisões, alternativas, testes e reversão](../../../planejamento-features/refinamento-f22-f23-f25.md). [Manifesto auditável](../../../planejamento-features/evidencias-refinamento-f22-f23-f25.json).

| Área | Verificação |
| --- | --- |
| Contato público | Seis temas, fontes/cores/cantos, centralização geométrica dos campos, checkbox nativa marcada/desmarcada via Espaço, foco e Axe |
| Validação | Campos obrigatórios, espaços, e-mail/telefone inválidos, foco no primeiro erro e ausência de envio inválido |
| Editor | Criação manual/assistida, contato em Página/Visão geral, alteração/cancelamento na prévia, busca em Página e quatro abas |
| Mobile/zoom | 390px, reflow a 320px com texto a 200%, modal em etapas e checkboxes alinhados |
| Prévia | Moldura 393:852, rolagem interna focável, formulário visível e envio desativado |
| Segurança existente | Visitante/outro dono sem leitura dos contatos, recuperação de falha, idempotência e CSV seguro |

Resultado final: 13/13 Playwright em desktop/mobile, 436/436 testes frontend, lint/typecheck/build aprovados. A rodada ampla anterior teve 55/57: duas falhas da consulta de formulário na prévia foram corrigidas e repetidas nos dois viewports. Não somar rodadas sobrepostas. F23 tem 21/21 próprios em sua pasta de evidências.

Inspeção visual direta incluiu modal mobile, checkbox marcada no tema claro/escuro em desktop, formulário mobile centralizado e formulário no telefone. A inspeção corrigiu a largura global que deslocava os campos no desktop; a regressão final verifica seu centro. As capturas estão em final, com hashes em capturas.json. Intermediaria e colisao são diagnóstico, não prova de aceite. O relatório temporário da rodada ampla foi substituído; seu log foi preservado.

Sem teste em dispositivo físico, produção ou provedores reais. Sem novos baselines visuais aprovados automaticamente. Testes usam fixtures e containers próprios, encerrados no teardown; sem banco pessoal alterado neste refinamento. Nenhuma branch/commit/push/deploy nova. S7 remoto continua pendente.
