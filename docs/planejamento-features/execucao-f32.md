# F32 — Kit de divulgação

20/10/2026. Implementação local na branch codex/roadmap-f37-testes, após F29. Sem push/deploy. D34 registra alternativas: Canvas nativo + QR F13 no navegador, sem serviço de imagem, tabela ou dependência nova.

## Jornada e contrato

Minha página → Resultados e divulgação → Kit de divulgação. Três etapas: formato, texto e cores. Post 1080×1080 e Story 1080×1920; dois templates, fontes e controles de cor existentes. Gerar prévia precede o download. Alterações tornam a arte anterior desatualizada e impedem baixar até regenerar. Textos são medidos e quebrados sem corte silencioso; falha de renderização preserva entradas. QR aponta para o endereço permanente /p/slug, com margem branca e marca Tem Link Aqui no rodapé.

Publicação é a fonte padrão; rascunho só por escolha explícita e com faixa PRÉVIA na imagem. A fonte oficial usa a projeção pública autorizada, respeita idade e inclui 18+ na arte. Antes de gerar e baixar, revalida sessão, acesso ao workspace, revisão e endereço. Nenhuma categoria, contato ou item privado entra por serialização automática. Leitura permite exportação local, sem conceder escrita. DownloadBlob foi extraído do QR existente, que ganhou regressão real de PNG/SVG. Skeleton mantém controles e geometria, sem piscar o início do painel.

## Critérios e testes

| Critério | Prova |
| --- | --- |
| AC01 | E01/E03: prévia obrigatória, versão alterada impede download, falha nativa recuperável |
| AC02 | Medição de texto/Unicode em unidade; inspeção direta dos PNGs Post, Story, rascunho e 18+ |
| AC03 | Decoder jsQR independente lê o arquivo PNG efetivamente baixado nos dois tamanhos/viewports; regressão F13 PNG/SVG |
| AC04 | DTO allowlist, isolamento de conta, revisão e restrição de idade em API/componentes/E02/E05 |
| AC05 | E02: nenhuma publicação ausente gera arte automaticamente; rascunho exige seleção e marca |

Frontend completo: 451/451 testes unitários, lint e typecheck aprovados. Playwright final 15/15, incluindo regressão F13 e cinco cenários F32 em desktop/mobile; build de produção executado pelo harness. E04 compara geometria durante carregamento real e após resposta; E03 usa teclado e reflow 320px/200%. Inspeção visual direta dos arquivos gerados confirmou texto, QR e marca. Sem backend novo, migration, env ou dependência.

Red inicial do contrato: quatro falhas esperadas, preservadas em output/f32-domain-red.log. Primeira rodada E2E: 11/13; duas falhas eram locator de alerta abrangendo também o route announcer do Next, corrigido para o escopo da feature. Primeiro frontend completo: 448/449; teste antigo supunha que toda a seção de divulgação exigia escrita. Corrigido para afirmar Kit visível com leitura e Campanhas/Contatos/Apresentação ainda bloqueados conforme permissões próprias. Relatório inicial/traces preservados. Não somar rodadas sobrepostas.

Referências: [Canvas measureText](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/measureText), [toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob), [compartilhamento Linktree](https://linktr.ee/help/en/articles/5434136-sharing-your-linktree). Fundamentam exportação explícita e medição; não houve cópia de layout nem inspeção visual de telas privadas externas. Refero indisponível.

## Operação e reversão

Sem persistência nova: remover entrada da navegação e rota reverte a feature; arquivos já baixados permanecem com o usuário. Manter downloadBlob compatível com F13. Não há promessa de audiência ou QR válido para rascunho não publicado. S0–S6 locais; CI/liberação remota S7 pendentes. Próximas F33 → F10; parar após F10.

Commit de implementação: dc859a9172511d83b6ccafc6284305d1cd164cd2.

## Clareza e composição da imagem — 2026-10-20

Página e menus agora se chamam Criar imagem de divulgação, mantendo /painel/perfil/divulgar e o ID F32. Modelos: Fundo simples (sem moldura) e Cartão com moldura (fundo colorido e conteúdo em superfície separada). O formulário explica a diferença; a cor de moldura só aparece no modelo correspondente. Em igualdade de cores, o cartão usa superfície contrastante; contorno mantém a forma visível. Sem novos componentes, dependências ou fontes.

Composição mede título e descrição antes de desenhar. Título tenta uma linha, reduzindo até 32 px no Post e 40 px no Story; apenas então permite quebra, preservando o texto. Removidas distâncias fixas que separavam excessivamente os blocos; QR maior, conteúdo agrupado com espaçamentos curtos e marca no rodapé. Mantidos PNG 1080×1080/1080×1920, prévia obrigatória, verificação de revisão antes do download, QR estável, aviso de rascunho e marca 18+. Decisão: distinguir composições, em vez de manter duas variações que apenas pintavam uma faixa.

Validação: 20/20 testes frontend (share-kit e navegação), lint e typecheck. E2E conjunto F32/F10: 23/23 desktop/mobile, QR decodificado dos PNGs reais, dois formatos, dois modelos, rascunho, idade, erro de exportação/revisão, teclado, zoom e axe. Repetição dirigida dos cenários novos F10-E05/F32-E06: 5/5 incluindo setup. Capturas/PNGs inspecionados: [Fundo simples](../frontend-profissional/evidencias/f32-imagens-2026-10-20/fundo-simples.png), [Cartão com moldura](../frontend-profissional/evidencias/f32-imagens-2026-10-20/cartao-moldura.png), [editor mobile](../frontend-profissional/evidencias/f32-imagens-2026-10-20/editor-mobile.png). Chromium emulado, sem aparelho físico.

Build final frontend aprovado com TEMLINK_E2E_BUILD=1, sem alterar configuração do servidor local. Sem commit ou deploy.

## Prévia automática — 20/10/2026

Mudanças em formato/modelo/origem/paleta agendam nova prévia imediatamente. Digitação de título, descrição e código hexadecimal, assim como ajuste contínuo de sliders, aguarda 500 ms sem nova alteração. Reutilizado o gerador Canvas e a leitura autorizada/publicação existente. Sem geração automática ao entrar inicialmente: ação manual continua disponível para início e recuperação de falhas. Download permanece explícito e exige arte atual.

Cada edição invalida a geração anterior; respostas atrasadas são descartadas e seu object URL é revogado. Timer é cancelado ao sair/trocar workspace; resultado de outro contexto não substitui a prévia. Controles/etapas continuam utilizáveis durante geração. Atualizações automáticas não repetem a mensagem de sucesso a cada edição. ColorPicker informa opcionalmente edição contínua; os consumidores antigos que recebem somente a cor mantêm comportamento. Campos inválidos preservam a entrada e não liberam download desatualizado. Sem novas dependências ou alteração de backend/moderação/rastreamento.

Decisão: um timer local no coordenador existente em vez de adicionar biblioteca de debounce ou outro editor. Reversão deve retirar agendamento e sinal de edição contínua desta fatia, preservando o gerador e os controles originais; manter alterações anteriores deste working tree.

Validação da prévia automática: 15/15 testes unitários (share-kit + ColorPicker), lint e typecheck frontend aprovados. Suíte completa F32: 15/15 E2E incluindo setup em desktop/mobile; repetição final F32-E07: 3/3 incluindo setup após ajuste de disponibilidade das etapas e mensagem de sucesso apenas manual. O teste mede uma única leitura após edição rápida, troca formato/cor/origem sem gerar manualmente e confere download habilitado só após a arte atual. Testes de componente cobrem timer de 500 ms, descarte de resultado antigo/object URL e cancelamento ao sair. Build frontend aprovado com TEMLINK_E2E_BUILD=1. Capturas [desktop](../frontend-profissional/evidencias/f32-previa-automatica-2026-10-20/desktop.png) e [mobile](../frontend-profissional/evidencias/f32-previa-automatica-2026-10-20/mobile.png) inspecionadas. Sem teste em aparelho físico, commit ou deploy; alterações anteriores preservadas.
