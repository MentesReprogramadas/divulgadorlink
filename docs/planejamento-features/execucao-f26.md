# F26 — Comparar botões

Implementação local em 21/10/2026. **Painel → Minha página → Resultados e divulgação → Comparar botões**. Configurar duas versões, revisar/publicar a página e iniciar. Reutiliza rascunho, autosave/CAS, etapas, iPhone da prévia, publicação/moderação F09/F42, medição/consentimento F31, permissões e auditoria existentes.

## Decisão estatística, alternativas e fronteira

- Um botão comum por página e um teste ativo. Compara somente textos; destino, posição, aparência e publicação são compartilhados. Eventos e exemplos de modelo ficam fora desta primeira versão. Comparação apenas no idioma original; traduções F39 mantêm seus próprios textos.
- Objetivo fixo e explícito: cliques por visita com exposição do botão. A/B em 50/50, HMAC do experimento e da sessão existente. Recarregar na mesma visita preserva versão. Não cria cookie de experimento; a sessão técnica existente do middleware HTML permanece. Nenhum registro de experimento é gravado sem consentimento específico de medição; DNT/GPC, bot, dono, admin e suporte são excluídos.
- Prazo completo de 7, 14 ou 28 dias, padrão 14. Amostra mínima por braço de 100 a 10.000 visitas, padrão 1.000. Amostra é requisito da conclusão, não gatilho de interrupção antecipada. Alternativa de encerrar ao atingir a última impressão foi descartada: excluiria o clique posterior da última visita e favoreceria análise antecipada.
- Uma análise bilateral de duas proporções, α=5%, z≥1,96, diferença mínima de dois pontos percentuais e frequências esperadas de sucessos/falhas ≥5 em cada braço. Sem amostra ou aproximação válida: inconclusivo. Durante execução e em interrupção manual: sem vencedor. Não escolhe pelo total bruto de cliques. Não aplica resultado automaticamente. A inferência assume visitas independentes; retorno de pessoas em novas sessões, tráfego artificial e repetição de experimentos limitam a interpretação. Não promete causalidade nem desempenho futuro.
- Alterar a publicação encerra o teste conservadoramente. Pausar medição ou perder cobertura do plano impede atribuição/coleta. Relatório sem cobertura atual oculta contagens, taxas e conclusão; não cria nova cobrança, preço ou capability. Reutiliza `profile.analytics` da F11/F31.

## Persistência, autorização e segurança

Configuração pertence ao rascunho e ao snapshot privado aprovado. Os textos das duas variantes passam pelo mesmo bloqueio, IA, revisão humana, WhatsApp e contestação. A fila admin mostra as variantes. Publicação pública mantém sua allowlist; configuração não ativa teste por si só. Iniciar exige a versão atual já publicada, botão elegível e medição habilitada. IDs de botão removidos são eliminados da configuração; importação remapeia IDs. Exportação, descarte e histórico preservam o agregado existente.

Experimentos são vinculados a tenant/perfil/dono/versão. Índice parcial garante um ativo por página, lock de perfil serializa início/coleta/encerramento, repetição de início ativo devolve o mesmo ID. Exposição exige 50% por um segundo contínuo no navegador; API valida publicação, token F31, variante determinística, elegibilidade e consentimento. Clique só atualiza exposição já existente. Uma exposição e um clique por sessão/experimento; sem URL, nome, e-mail, entrada digitada ou identificador bruto nos registros/relatórios. Hash de sessão específico por experimento. Retenção de 180 dias; últimos 20 testes no painel.

`page.read/write` governa consulta e operação, inclusive no espaço global compartilhado; roles de página antigas continuam READ/PUBLISH. A auditoria guarda o operador real. Revogação é conferida no servidor. A versão escolhida só entra no rascunho após clique explícito; publicar continua sendo ação separada. Falha de atribuição no visitante usa o texto original e não fabrica exposição.

## Evidências locais

- Domínio F26: 3 testes aprovados; exportação/importação com remapeamento de botão e traduções: aprovado.
- PostgreSQL/HTTP de perfis e interações: **33 aprovados**, incluindo moderação das variantes, estabilidade, dedupe, clique sem exposição, token adulterado, prazo, troca de publicação, plano, isolamento, permissões e ator da auditoria.
- Hook frontend: 3 aprovados, incluindo consentimento, exposição contínua, ausência de duplicação e falha segura. Suíte de perfis/contatos/descoberta/webhooks anterior: 92 aprovados; consolidação final: 136 testes frontend aprovados em 37 arquivos.
- Playwright F26/F31: **13 aprovados**, desktop/mobile e setup, 1,7min. Cadastro real, publicação, duas sessões de variantes conhecidas, reload estável, clique real, relatório, interrupção, aplicação só no rascunho, erro conservando dados, 320px e worker BullMQ de retenção F31. Axe do painel: nenhuma violação nos critérios executados. Uma execução anterior foi recusada pelo guard do script de teste devido ao prefixo do run ID; reexecutada com ID `f26-roadmap-20261021`, sem enfraquecer a proteção.
- Capturas em `docs/frontend-profissional/evidencias/f26-roadmap-2026-10-21/`, relatório mobile inspecionado. Lint/typecheck/build dos dois pacotes aprovados no fechamento em execucao-f36.md.

## Liberação e reversão

Migração aditiva `20261021160000_button_tests`, validada e aplicada somente em PostgreSQL descartável. CI, S7, deploy e banco pessoal/de produção pendentes. Para desativar, interromper os testes, retirar entrada do painel e hook público; manter registros para retenção/exportação. Não apagar dados nem cancelar assinaturas automaticamente. Sem novos commits/push nesta rodada.

## Fechamento do lote — 21/10/2026

Lint/typecheck e builds dos dois pacotes: exit 0 (build Next em cópia isolada para preservar servidores de outras tarefas). Consolidação: 32 testes backend/domínio, 69 PostgreSQL e 136 frontend aprovados. Playwright final F36/F20/F19/F31: 25 aprovados, zero skips/flaky/falhas; resultados anteriores específicos desta feature permanecem acima. Atualização incremental do grafo e inspeção das capturas concluídas. Detalhes e JSON: [execução F36](execucao-f36.md); [como testar/configurar](testar-lote-2026-10-21.md). F40/F41 não iniciadas. S7/CI/deploy continuam pendentes; nenhuma migração no banco pessoal e nenhum novo commit/push.

Atualização posterior autorizada em 21/10/2026: migrations do lote aplicadas também no PostgreSQL local `localhost:5437/divulgador`, com backup fora do repositório, status atualizado e Prisma Client gerado. Commit/push deste lote autorizados na branch `codex/roadmap-f37-testes`; detalhes em [execução F36](execucao-f36.md). Produção não alterada.


## Revisão de fluxo posterior — 21/10/2026

F26 revalidada na revisão explícita das sete áreas, incluindo navegação por contextos, hierarquia, componentes da casa, busca/filtros e permissões. Resultados anteriores permanecem históricos. Mudanças, testes reais e evidências em [revisão consolidada](../frontend-profissional/revisao-fluxos-2026-10-21.md). Esta revisão está na árvore local, sem novo commit/push/deploy.
