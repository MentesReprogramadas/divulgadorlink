# Domínio, idiomas, atendimento e composição do painel — 21/10/2026

## Escopo e comportamento

- Comprovação do domínio do destino por DNS TXT em `_temlinkaqui-verification.<hostname>`. O token continua aleatório, privado no armazenamento por hash, vinculado a titular/tenant/revisão/destino, com desafio de 30 minutos, uso único, limite de criação e selo por 30 dias. Registros TXT segmentados são unidos apenas dentro do mesmo registro. Não se juntam registros distintos.
- Migração aditiva `20261021140000_ownership_dns`: distingue provas antigas HTTPS de DNS. Desafios/provas HTTPS antigos não viram comprovação DNS. É necessário comprovar novamente. A leitura HTTPS segura permanece para verificação de endereços próprios, que é outro fluxo.
- Idioma do visitante obtido de `Accept-Language` antes da renderização pública. Idiomas suportados existentes: português, inglês e espanhol. Traduções do cliente usam o fallback original; controles do sistema usam o idioma do visitante mesmo sem tradução do conteúdo. URLs explícitas de idioma e prévia permanecem compatíveis. Não há seletor na página pública.
- Editor de idiomas mantém a definição do idioma original do conteúdo e dos idiomas traduzidos, com bandeiras desenhadas em SVG nas opções e no valor selecionado. O usuário confirmou que a detecção automática é do visitante, não do texto escrito pelo cliente.
- Formulário, validações, mensagens de recuperação, eventos, datas, busca, filtros, paginação e marca da página recebem textos de interface localizados. Conteúdo escrito pelo cliente e destinos não são traduzidos automaticamente nem enviados a serviços externos. A política e o banner global de consentimento continuam os existentes.
- “Salvar rascunho” na última etapa de idiomas salva e abre a mesma revisão de publicação do atalho superior. Falhas mantêm a edição e impedem a navegação.
- Abas e ações compartilham linha quando há espaço. Componentes comuns cobrem favoritos, equipe e detalhes de links permanentes; integrações, gestão administrativa, moderação e notas receberam composição explícita. Em telas estreitas há quebra de linha e seletor acessível onde o componente já oferece esse modo.
- Notas: seis por página, texto limitado visualmente, leitura completa por expansão e confirmação substituindo a lista. Histórico: cartões em grade, ícones por ação, cores semânticas e navegação de páginas, com continuação do cursor do servidor sem saltar registros na fronteira dos lotes.
- `/paginas`: largura e margens iguais à home, categorias com o slug real para usar os mesmos ícones, filtro “Somente páginas que sigo” removido da interface. Seguir/deixar de seguir e autorização do servidor continuam existentes.
- Integrações: chave aleatória persistida apenas no `.env` local ignorado pelo Git, sem imprimir o segredo. O aviso orienta a configuração quando ela faltar; a proteção criptográfica não foi desativada. A chave não é enviada ao cliente.

## Referências e critérios visuais

- Home local inspecionada no Chromium: mesma caixa de conteúdo, margem de 36 px em viewport de 1440 px e ícones da categoria como fonte principal para `/paginas`.
- Painel e primitivas existentes são a referência de cores, tipografia e controles. Não foram importados layouts ou dependências. Refero não estava disponível nas ferramentas da sessão.
- [Cloudflare: DNS TXT e comprovação de domínio](https://www.cloudflare.com/learning/dns/dns-records/dns-txt-record/) fundamenta a orientação de criar um registro TXT e o tratamento de segmentos separados.
- [Shopify Polaris](https://shopify.dev/docs/api/polaris) consultado como referência complementar de consistência; não foi copiado código ou adotada biblioteca.

## Validação e ambiente

Ambiente E2E descartável em portas 15000/15333/16099, PostgreSQL 17433 e Redis 18380; containers com sufixo `domain-ui-20261021`. Nenhum servidor alheio foi encerrado. O banco local `localhost:5437/divulgador` recebeu somente a nova migração, única pendência confirmada antes da aplicação.

Inspeção real pelo Chrome DevTools: desktop 1440×900 e emulação mobile 390×844, DOM, foco e console. Integrações exibiu abas e ações alinhadas no desktop, seletor em mobile, sem overflow ou erros no console. Editor mostrou bandeiras no controle e na lista. Home e `/paginas` tiveram a mesma largura/margem. Capturas de notas, histórico e confirmação examinadas visualmente em desktop/mobile: [evidências](evidencias/ajustes-dominio-idiomas-2026-10-21/). O cenário novo fixa os horários de notas e histórico para tornar as capturas repetíveis.

Checks de frontend e backend, testes afetados e jornadas Playwright executados durante a implementação. Rodadas intermediárias encontraram testes com idioma de contexto implícito, nomes antigos da navegação e contagens antigas de permissões; ajustes ficaram nos testes, sem mudança das concessões. Um build normal encontrou disputa de arquivos com o servidor de desenvolvimento já ativo; usar a saída isolada `.next-e2e` para a verificação final.

Resultados finais:

- Frontend: `npm run lint`, `npm run typecheck` e `TEMLINK_E2E_BUILD=1 npm run build` passaram na sequência final. A saída de build isolada preservou o servidor de desenvolvimento em `localhost:3001`, cuja rota de login respondeu HTTP 200. Permaneceram avisos já existentes de configuração ESLint, raiz com múltiplos lockfiles e prefixação CSS; não houve erro de compilação na passagem final.
- Vitest frontend: **110 testes em 26 arquivos**, todos passaram. Inclui formulários, validação, eventos, idiomas, descoberta, integrações, atendimento, cursor na fronteira de 50 registros, primitivas, ícones/navegação, consentimento e administração.
- Backend: lint, typecheck e build passaram; nove testes de domínio/adapters passaram. PostgreSQL descartável: oito testes de ownership e cinco de descoberta passaram, incluindo concorrência, isolamento, expiração, troca de titular e rejeição de desafio HTTPS legado como prova DNS.
- Playwright amplo: **42 de 45** passaram antes da correção final; as três falhas foram corrigidas (duas de foco na troca de área de moderação mobile e uma assertiva de alinhamento vertical que confundia a linha das abas com o título da subseção).
- Playwright final dirigido: **11 de 11** passaram, cobrindo os cenários corrigidos e notas/paginação em desktop/mobile. Mantém verificações de foco, permissões e Axe; não foram aumentadas tolerâncias nem removidas verificações de segurança.
- O primeiro typecheck paralelo à reconstrução de `.next-e2e` encontrou arquivos gerados sendo recriados. A verificação final é sequencial ao build, sem mudar o contrato TypeScript para ocultar isso.

Logs locais: `output/requested-ui-frontend-tests-final.log`, `output/requested-ui-e2e-final.log`, `output/requested-ui-e2e-focus-final.log`, `output/requested-ui-ownership-pg.log` e `output/requested-ui-frontend-build-final.log`.

## Limites e reversão

Arquivos principais da alteração:

| Área | Arquivos |
| --- | --- |
| DNS | `backend/src/domain/verification/ownership.ts`, `backend/src/adapters/http/ownership-fetch.ts`, `backend/src/repositories/ownership.ts`, controlador `@Redirects/routes.ts`, migração `20261021140000_ownership_dns` e feature frontend `ownership/`. |
| Idiomas | `frontend/src/domain/public-page-locale.ts`, `features/profiles/profile-languages-screen.tsx`, `components/language-flag.tsx`, `profile-explorer.tsx`, `profile-view.tsx`, `profile-search-controls.tsx`, `server/load-profile.ts`, rota `app/p/[slug]/page.tsx`; formulários, eventos e marca da página. Backend: `profile-translations.ts`. |
| Atendimento | `features/contact-forms/contact-handling.tsx`, CSS Module, testes de componente e `e2e/contact-handling.spec.ts`. |
| Abas e ações | `components/ui/tabs.tsx`, `responsive-tabs.tsx` e CSS Modules; `workspace-team-screen.tsx`, `redirect-screen.tsx`, `webhooks-screen.tsx`, `admin/visao/office.tsx`, `moderation-workspace.tsx` e filas de revisão. |
| Descoberta | `profile-discovery.ts` no backend; `discovery-api.ts`, `discovery-screen.tsx`, skeleton e CSS Module; `facet-filters.tsx` aceita slug de ícone separado do identificador do filtro. |
| Verificação | Specs afetadas de ownership/idiomas/contatos/eventos/descoberta/integrações/moderação/equipe; locale explícito em contextos de teste; `playwright.config.ts`; índice Graphify incremental. |

Não houve commit, push, deploy, nova dependência ou alteração de cobrança/moderação/permissões. A migração foi aplicada apenas localmente e nos bancos descartáveis de teste. Não foi feito teste de publicação TXT em um DNS real nem envio para serviços de clientes. Mobile é emulação, não aparelho físico.

A árvore já tinha muitas alterações anteriores e recebeu mudanças simultâneas. Reverter somente os trechos desta tarefa, preservando os demais. A coluna `method` é aditiva e pode permanecer durante uma reversão do código; não excluir tabelas/desafios para reverter. A chave local deve ser preservada enquanto houver integrações criptografadas com ela. Removê-la ou trocá-la impede ler seus segredos.
