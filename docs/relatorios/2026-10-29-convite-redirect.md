# Convite direto e tela opcional

O convite permanente agora abre automaticamente um grupo disponível no WhatsApp. REDIRECT é o padrão persistido para segmentações novas e existentes; SCREEN mantém a opção de apresentação antes do clique. O assistente permite escolher o comportamento e revisá-lo antes de salvar. A navegação automática usa replace para não deixar uma etapa intermediária no histórico.

O GET continua inerte. A abertura automática utiliza o POST existente, com CSRF, verificação de capacidade, bloqueio de concorrência e expansão existentes. Erros oferecem tentativa manual, sem repetição automática. O destino continua restrito a HTTPS chat.whatsapp.com. Nenhuma oferta é enviada por este fluxo.

A tela opcional contém avatar circular de 176 px, título em uma linha e botão, sem card, descrição ou selo. Nomes maiores usam reticências visuais mantendo o nome acessível e title completos. Foto ausente ou quebrada usa iniciais. A foto armazenada só é servida publicamente quando pertence ao tenant e está vinculada a uma segmentação ativa; outras imagens administrativas não ficam públicas. Cabeçalho, rodapé, consentimento e metadados existentes permanecem.

Teste de foco W04 do CI anterior: o menu provisório e o definitivo compartilham o nome da região. O teste podia focar o provisório, removido ao finalizar a sessão. Agora espera a ação Ajuda do menu definitivo antes de testar o foco; a asserção permanece igual.

Verificação executada: lint/tipos/build backend e frontend; 49 regressões PostgreSQL (incluindo convites/expansão/descoberta), mais teste HTTP de imagem; 924 testes frontend, 18 afetados repetidos; 24 E2E desktop/mobile, 6 E2E finais de convites/assistente e W04 desktop/mobile (3 com setup) aprovados; inspeção Playwright MCP com 390 e 1440 px. 883 testes backend aprovados entre execução geral (881) e duas provas Pix repetidas com PG/Redis isolados, após configuração inicial apontar para schema local antigo. Sem migração nesse schema antigo. Sem overflow observado; conteúdo principal apenas título e botão, com avatar. Emulação não substitui aparelho físico. Capturas locais em output/invite-mobile-final.png e output/invite-desktop-final.png.

Migração aditiva: joinMode com default REDIRECT. Reversão do comportamento: escolher SCREEN na segmentação; rollback de código mantém a coluna adicional sem perda de dados. Publicação passa pelo CI obrigatório. Termos de Natal da correção anterior também aguardam esse gate.

O CI seguinte revelou a mesma disputa no teste SEO mobile: HomeSkeleton e HomeContent reutilizam HomeHeroCopy. A medição capturou um nó removido (altura zero e line-height não numérico). O teste agora aguarda Mostrar mais do catálogo definitivo antes de medir; mantém a exigência de título em uma linha e ausência de overflow. Sem alteração de produção na home. Suíte SEO completa: 20/20 desktop/mobile aprovados em banco/Redis próprios.
