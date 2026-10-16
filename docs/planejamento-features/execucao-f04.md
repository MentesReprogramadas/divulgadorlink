# F04 — favoritos e coleções

## Autorização e D05 — 16/10/2026

Executar o ajuste aleatório de F03, depois somente F04 e parar. Branch codex/roadmap-features, baseline 28a813b. Preservar artefatos preexistentes; sem main ou deploy.

D05: um favorito pode pertencer a várias coleções privadas. Exclusão da coleção remove somente associações; desfavoritar remove suas associações e não altera o catálogo. Coleções ordenam itens por posição/ID, com ações explícitas para subir/descer. Nome entre 1 e 80 caracteres, sem HTML interpretado. Não introduzir quota comercial; lotes de leitura de 20 itens e nome/posição limitados são proteções técnicas, com paginação para acessar o restante. Criação usa UUID fornecido pelo cliente para retry idempotente; operações sobre coleção usam versão para evitar perda de edição concorrente. Sem compartilhamento público, colaboração, IA ou notificações.

Somente a conta atual ativa pode ler/alterar seus favoritos, inclusive quando o token contém ADMIN: não há acesso administrativo aos favoritos alheios. Host e sessão determinam tenant/usuário, autorização revalidada no banco. Favoritar não exige capacidade de publicar nem concede essa capacidade. Idade por nicho/rede e publicação são verificadas para novas adições. Itens salvos que deixam de ser elegíveis retornam placeholder sem nome, descrição ou destino. Exclusão definitiva do link remove o favorito por FK; indisponibilidade preserva o placeholder. Exclusão de conta remove dados privados por cascata. Sem retenção analítica nova.

Reutilização: LinkRow para item público elegível, card explicativo para indisponível, Button/Field/Input/Select, API/BFF/CSRF, sessão/painel e tokens atuais. Favoritar no detalhe e na jornada do catálogo; biblioteca privada em /painel/favoritos. Não misturar coleções privadas com categorias de perfil público. Fronteira de persistência específica e domínio puro; sem abstração universal de CRUD.

## Andamento

S0–S7 concluídas na branch; AC01–AC05 aprovados, com evidências locais e CI final. Encerrar após F04.

## Contratos e fronteiras

Rotas sob `/api/v1/me`: GET/PUT/DELETE favorites/:linkId, GET favorites?cursor; GET/POST collections; GET/PATCH/DELETE collections/:id; PUT/DELETE/PATCH collections/:id/items/:favoriteId. Coleções retornam id/name/version. POST recebe UUID de criação; PATCH de nome e operações de itens recebem expectedVersion. DELETE de coleção recebe expectedVersion na query. PATCH de item recebe move up/down, trocando posições vizinhas; essa intenção substitui a proposta genérica de aceitar posição arbitrária. GET de coleção retorna seus itens e nextCursor; GET favorites/:linkId fornece apenas saved/favoriteId do próprio usuário para o botão.

IDs ASCII até 64 caracteres; nomes validados no domínio, sem caracteres de controle. Todas as leituras são private/no-store. Sessão ausente retorna 401; tenant incompatível ou conta indisponível, 403; recurso alheio/ausente, 404; entrada inválida, 400; versão desatualizada ou identidade reutilizada, 409. Entrada de nome/coleção/item é estrita. CSRF existente cobre também PUT e DELETE por cookie; autenticação bearer mantém seu contrato anterior. Nenhuma ação usa tenant/user/role do corpo para decidir autorização.

O authorize genérico concede privilégio ADMIN sobre recursos de terceiros; isso não atende coleções privadas. O adapter usa os mesmos mecanismos de sessão/tenant, mas exige o proprietário em todas as consultas. Revalida usuário ACTIVE no banco e não concede acesso adicional ao papel ADMIN. O gate visual do painel continua existente; não foi usado como autorização da API. Limite existente: o painel pode encaminhar contas não verificadas à verificação antes de abrir esta tela, embora a API de favorito não conceda nem exija capacidade de publicar. Essa regra visual preexistente não foi relaxada.

## Persistência, concorrência e dados privados

Migração aditiva 20261016140000_favorites_collections: Favorite único por tenant/user/link; Collection privada versionada; CollectionItem com posição. FKs compostas ligam usuário/tenant, link/tenant e favorito/coleção/usuário/tenant. Índice único redundante de users(id,tenantId) é necessário à referência composta, sem alterar IDs. Associação não pode apontar para favorito de outro dono, mesmo por SQL direto. Posição é única por coleção, com constraint DEFERRABLE INITIALLY DEFERRED para troca atômica de duas posições; a deferrabilidade é mantida pelo SQL, pois o schema Prisma não a expressa. O adapter não usa ON CONFLICT nessa constraint.

Escritas bloqueiam primeiro a linha do usuário real, serializando operações privadas desse dono; depois leem/alteram os recursos. Conta suspensa ou removida não escreve. PUT de favorito é idempotente; criação com UUID repetido e mesmo nome retorna a coleção, sem duplicar. PATCH de nome/version e itens modificados incrementam a versão. PUT de associação já existente e DELETE de associação ausente são no-op; não incrementam versão nem desfazem alterações posteriores. Desfavoritar remove associações e incrementa a versão das coleções afetadas, preservando os links. O conflito 409 exige atualização explícita, sem sobrescrever nome remoto.

Leituras usam snapshot RepeatableRead. Paginação por chave, lotes de 20 mais um para continuação; cursor deve pertencer à lista privada atual. Coleções ordenadas por ID; favoritos por ID; itens por posição/ID. Não há snapshot entre requisições: alterações enquanto se pagina podem exigir Atualizar dados, principalmente se o cursor for removido. No frontend, envio/paginação são bloqueados durante operação pendente e respostas de navegação anterior são descartadas por revisão local. Atualizar pode voltar ao primeiro lote; o recurso não promete preservar posição de leitura após uma mutação.

Favorito novo exige link publicado, proprietário elegível, tenant consistente e aceite de idade quando nicho ou rede exige. Na leitura, indisponível, suspenso, restrito sem aceite ou vínculo corrompido retorna somente id/linkId/available=false e associações próprias. A UI mostra Link indisponível, sem nome, descrição ou destino. Nova leitura revalida; não há atualização por push de uma página já aberta. Hard delete do link remove favorito por FK; exclusão de conta remove seus favoritos, coleções e itens. Sem backfill, cópia de contatos, compartilhamento público ou retenção nova. Falha inesperada do Prisma é sanitizada antes do handler global: logs/traces recebem código e erro genérico, sem SQL, nome de coleção ou parâmetros privados.

## Reuso e interface

Rotas app apenas compõem a tela; features/favorites contém carregamento, contrato, formulário, lista e ação de salvar. CollectionNameForm preserva rascunho e UUID após falha; foco vai à confirmação após persistência. FavoriteList usa LinkRow para conteúdo elegível e placeholder sem link para conteúdo oculto. O renderer LinkRow recebeu somente um slot actions; as composições de home/busca/facetas fornecem FavoriteButton. O detalhe compõe a mesma ação. Não se moveu transporte/sessão para o renderer. Botão fica acima da camada clicável do card para evitar abrir o link ao favoritar.

O estado salvo inicial consulta o servidor quando a sessão visual existente está presente ou é atualizada; visitante pode solicitar salvar e é encaminhado ao gate de login do painel. Esse cache visual não autoriza escrita. Em falha, o botão conserva o último estado confirmado, sem sucesso otimista. Se o navegador não possui o cache visual de uma sessão ainda válida, o primeiro PUT continua idempotente e confirma o estado no servidor. O login do visitante abre a biblioteca; salvar automaticamente o link anterior após autenticação não faz parte do contrato desta entrega.

Biblioteca em /painel/favoritos, com navegação no painel, lista de coleções, criação/renomeação, associação, retirada, Subir/Descer, desfavoritar e confirmação de exclusão. Excluir coleção informa que favoritos/links serão preservados e permite cancelar. Coleções podem ser abertas por botões diretos; o Select escolhe um alvo de associação por ação, sem seleção múltipla implícita. Nomes continuam texto escapado pelo React. Não há nova biblioteca, fonte, preço ou template universal.

## Direção visual e inspeção

Direção dominante: painel e cards existentes. A referência [GOV.UK Select](https://design-system.service.gov.uk/components/select/) foi lida e inspecionada no Chrome, fundamentando rótulo associado, opção vazia e separação entre escolher alvo e confirmar a ação. A fonte também registra dificuldades de uso; por isso a abertura das coleções usa botões diretos e o Select fica restrito à organização privada em listas do usuário. Não se copiou identidade ou código da referência. Refero segue indisponível nesta sessão. A página alternativa de confirming-a-transaction não carregou; não foi usada como evidência.

Chrome real em tenant sintético independente verificou 1280×720 e 390×844 touch: hierarquia, labels, noindex/nofollow, ausência de sentinela oculta e foco por Tab. Botão Criar coleção com outline azul 3px; texto secundário rgb(92,107,127) sobre branco, contraste 5,43:1. Inspeção descobriu uso indevido do token inexistente space-5 e largura de form afetada pelo seletor global do painel. Corrigidos usando space-6 e um wrapper com responsabilidade de largura; não se elevou especificidade nem se alterou o global. As capturas finais do Playwright foram abertas para conferir espaçamento e limite do formulário após o ajuste.

E03 cobre 320px e texto raiz 200%, sem overflow horizontal. A navegação antiga do painel tem rolagem horizontal própria; o documento não ganha overflow. Cards legados usam fontes em pixels, e aumentar o texto raiz não equivale a zoom nativo de todos os elementos. Sem alegação de aparelho físico, leitor de tela, auditoria completa de acessibilidade ou diff pixel a pixel. A matriz de estados/viewport e capturas registram o escopo da prova.

## Testes, falhas e correções

U/C iniciais falharam por módulos ausentes, antes da implementação. Domínio testa normalização/rejeição de nomes e projeção indisponível; unicidade e cascata dos cenários U01/U02 são provadas na persistência real, sem criar store em memória que replique o banco. C01 testa confirmação, bloqueio de envio repetido, retry com UUID estável e rascunho preservado; C02 impede destino/metadados no placeholder. Um erro de sintaxe durante o desenvolvimento impediu o carregamento do app; foi corrigido e os logs vermelhos permanecem separados. A duplicação de alertas do formulário foi removida, reaproveitando o Field existente.

PG/HTTP: concorrência de cinco saves; tenant/dono/admin/visitante/suspensão; múltiplas coleções; exclusão sem apagar catálogo; conteúdo oculto e idade por rede; criação repetida; CAS concorrente com um 200 e um 409; ordem persistida; FKs negativas; paginação completa de favoritos/coleções/itens; CSRF real por cookie; cascata de dados privados na exclusão da conta. Trigger sintético provoca falha depois da inserção do item e antes do incremento da versão: a transação reverte ambos, comprovando rollback real.

E01 salva pelo catálogo, recarrega, associa em duas coleções, reordena, renomeia, cancela/confirma exclusão e troca sessão; verifica DB e catálogo preservados. E02 percorre login do visitante, outro dono e acesso direto privado, e depois retira o link do ar para conferir ausência de nome/destino no DOM e payload. E03 usa rede offline real, mantém rascunho, salva por Enter, confirma foco e reload; desktop/mobile. Nenhum mock de API interna ou dado real de usuário.

O ensaio antigo de worker Pix falhou durante a suíte paralela e passou isolado. Os scripts usam mesma fila e provedores de teste distintos; fileParallelism=false evita consumo cruzado entre arquivos. A suíte backend completa passou com 403 testes, sem relaxar assertivas ou alterar o worker de produção.

O CI documental anterior 38918764216 de F03 falhou na regressão de payload grande: esperava 413 e recebeu 500. A API já limita body a 1.048.576 bytes; o proxy podia continuar escrevendo enquanto a API encerrava a conexão. Teste HTTP local vermelho/verde comprova a proteção: acima do limite o BFF retorna 413 antes de abrir socket, mantendo envelope genérico e request_id; no limite exato, encaminha normalmente. Não é quota comercial nova. O cenário E2E existente continua exigindo 413, sem aceitar 500 ou retry para esconder a falha.

## Migração, recuperação e indicadores

Deploy Prisma aprovado no banco local com histórico e nos harnesses. O clone anterior sem histórico Prisma foi copiado para f04_migration_proof e recebeu o SQL exato, sem reset. Hashes de todas as linhas antigas de links, promoções e usuários permaneceram iguais; as três tabelas novas começaram vazias. Depois, fixtures de 10.002 favoritos/itens e 10.000 coleções comprovaram seleção natural dos índices owner_page e collection_items_position_key por EXPLAIN ANALYZE. A prova é do acesso paginado descrito, sem prometer performance de produção.

Recuperação ensaiada: leitor atual do catálogo anterior à F04 permanece funcional com as tabelas novas, preservando todas as contagens privadas e públicas. Rollout futuro: migration aditiva primeiro, depois build compatível e validação por conta/tenant. Nenhum flag comercial ou provedor novo. Rollback retira entrada/botões/tela/rotas e conserva tabelas/dados; não desfavoritar usuários nem apagar coleções para voltar de versão. Manter também o suporte a RELATED e às demais features já entregues. Índice novo de users pode bloquear escrita durante criação; planejar janela pelo volume real em eventual deploy.

Indicadores da fonte: usuários com favoritos podem ser agregados por tenant a partir do banco existente, sem expor conteúdo/nome das coleções. Os eventos atuais de visita não identificam usuário logado para ligar retorno a favorito; não afirmar que essa taxa está instrumentada nem acrescentar identificação silenciosa. Observabilidade operacional usa HTTP status/duração e favorites.failed sanitizado. Não há novo evento publicitário ou serviço de envio.

## Fechamento

Resultados locais: 403 testes backend (98 arquivos), 183 frontend (54), 127 PG/Redis (13; dez F04), 84 E2E na regressão completa, 13 no recorte F03/F04 após ajuste visual e oito na verificação final de favoritos/payload. Lint/typecheck/build dos dois pacotes e validação Prisma aprovados. CI final repetiu as suítes completas, sem skips/retries no Playwright.

Código final `1f283a46cfe0a71cea2afb2abde223cb6dd9eb43`, com [CI 38923117928](https://github.com/MentesReprogramadas/divulgadorlink/actions/runs/38923117928) aprovado em verify/web/images/e2e. O run intermediário 38922643082 foi cancelado por ser substituído pelo fix final, sem ser usado como aceite. Atualização posterior é documental. Comandos: backend npm run lint/typecheck/test/build/test:pg; frontend npm run lint/typecheck/test/build/test:e2e. PG_SPECS=1 e URLs locais descartáveis; E2E_PORT_OFFSET=100 e E2E_RUN_ID=roadmap. Evidências em `evidencias/F04/2026-10-16`; logs vermelhos/verdes separados, JSON/capturas e provas SQL sem cookies/traces autenticados.

AC01/T01: PG I01 + E01 persistência entre sessões. AC02/T02: I02/PG01 e E02 para dono/tenant/ADMIN/visitante/CSRF; rollback e cascata de conta. AC03/T03: cinco saves concorrentes no PG, duplo clique C01/E01 e UUID idempotente. AC04/T04: U03/C02/PG02/E02 redigem conteúdo/destino quando indisponível. AC05/T05: PG e E01 comprovam duas coleções, exclusão de uma com outra e favorito preservados e catálogo publicado intacto.

Spec, plano, D05, S0–S7, inventário e matriz atualizados. Parada após F04 solicitada pelo usuário. Nenhum deploy, alteração na main, Coolify, envio ou cobrança real. A próxima feature da sequência, F09, não foi iniciada.

## Correção de foco em 16/10/2026 durante retomada do roadmap

O CI 38963209066 encontrou uma corrida de foco em F04-E03 mobile: a mensagem de sucesso recebia tentativa de foco antes de ter texto e permanecia oculta por `.status:empty`. O commit `1066fec` usa `useLayoutEffect` após o commit do DOM, com teste de regressão reproduzindo a falha. Frontend 197 testes, lint/typecheck/build e regressão local 92 E2E passaram. Registro, evidências e estado do CI em [execução F12](execucao-f12.md#regressão-de-foco-encontrada-durante-a-preparação). Nenhuma alteração de privacidade, autorização ou persistência de favoritos.
