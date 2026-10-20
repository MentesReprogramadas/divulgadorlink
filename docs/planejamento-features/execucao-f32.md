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
