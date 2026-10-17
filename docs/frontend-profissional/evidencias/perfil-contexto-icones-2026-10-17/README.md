# Perfil: contexto aprovado, alinhamento e ícones — 17/10/2026

## Alterações

- Criar link: redes e nichos usam os logos/pictogramas existentes nas opções e no valor selecionado. Textos, nomes acessíveis, valores enviados e navegação por teclado são preservados. O Select compartilhado mantém a geometria corrigida dos popups em modais.
- Página pessoal: o texto de cada botão ocupa a coluna central de um grid simétrico, sem ser deslocado pela seta. Foto/inicial, nome, bio e títulos dos grupos compartilham esse centro. A escolha explícita de apresentação à esquerda continua disponível e alinha também os rótulos dos botões.
- Moderação: a IA recebe snapshots estruturados do conteúdo aprovado no servidor e da proposta, incluindo grupos, títulos, tipos/destinos e proteção etária. A instrução compara o risco introduzido, preserva o contexto aprovado e diferencia continuidade de conteúdo adulto permitido de uma transição para adulto ou retirada de proteção.
- Nomes de grupo compostos somente por pontuação não acrescentam assunto e dispensam nova análise, desde que nada mais tenha mudado. Textos novos com significado continuam avaliados.
- Termos, URLs e contatos presentes no texto aprovado não forçam novamente a fila por simples reaparecimento numa edição; a edição completa continua recebendo análise contextual da IA. Sinais novos mantêm o encaminhamento obrigatório. A primeira publicação mantém o bloqueio completo existente.

A mudança de moderação foi pedida explicitamente pelo usuário, além do ajuste visual. O comportamento anterior reutilizava apenas um resumo textual e não permitia à IA comparar destinos, categorias e idade antes/depois. Termos ou contatos já aprovados num campo editado ainda acionavam a fila antes da IA.

## Validação executada

| Verificação | Resultado |
| --- | --- |
| Frontend: lint, typecheck, build | Aprovados |
| Frontend: suíte Vitest completa | 253 testes, 76 arquivos aprovados |
| Backend: lint, typecheck, build | Aprovados |
| Backend: suíte Vitest sem PG | 457 testes, 108 arquivos aprovados |
| Backend: profiles.pg e content-reviews.pg | 28 testes aprovados em PostgreSQL descartável, porta 9134 |
| Playwright: F09-E07/E08/E09/E10, seis temas, ícones e envio de link | 13 testes aprovados incluindo setup; desktop e mobile |

E2E executado com `E2E_PORT_OFFSET=3600` e `E2E_RUN_ID=icons-alignment`, dados sintéticos e stubs de provedores. Os containers próprios foram removidos ao concluir. Nenhum serviço existente foi encerrado.

Cobertura: rascunho/envio, ícones carregados e selecionados, abertura por teclado e retorno de foco, dimensões de selects em modais, largura sem overflow horizontal, geometria central de rótulos longos na prévia e página pública, seis temas e axe A/AA, contexto aprovado por humano, edição com IA indisponível quando não há conteúdo novo, preservação de destinos publicados enquanto uma mudança aguarda revisão e envio dos snapshots completos.

O teste inicial de ícones procurava WhatsApp numa fixture que só disponibiliza Telegram e Site. A seleção foi corrigida para a rede existente; a nova execução passou.

## Capturas inspecionadas

Chromium via Playwright; página em 1280×720 e 390×844; formulário em 1440×900 e 390×900. Capturas full-page podem ter altura superior à viewport.

- [Página desktop](pagina-desktop.png)
- [Página mobile](pagina-mobile.png)
- [Redes mobile](redes-mobile.png)
- [Nichos desktop](nichos-desktop.png)

## Limites e reversão

Os testes do fluxo de moderação usam respostas controladas do provedor. Eles comprovam a comparação enviada, os desvios automáticos e a persistência/fila; não medem a precisão do modelo em produção nem garantem uma taxa de redução de revisões. Alterações semânticas continuam dependendo de veredito positivo e da confiança mínima configurada. Provedor indisponível, resposta inválida ou confiança insuficiente ainda encaminham alterações que precisam de IA para humano. A validação de destinos, bloqueios atuais, autorização e isolamento de tenant permanecem ativos. Casos que já estavam na fila não são aprovados retroativamente.

Não houve migração, dependência nova ou alteração de preços/quotas. As capturas não substituem teste em aparelho físico; zoom nativo e avaliação manual completa de contraste não foram repetidos nesta fatia. O build registra avisos existentes de múltiplos lockfiles e `start/end` no autoprefixer.

Reversão: reverter o commit desta fatia, abrangendo os arquivos de moderação/perfil e os componentes Select/FacetIcon/formulário, sem alteração de banco.
