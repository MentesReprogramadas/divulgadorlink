# Refinamento de páginas e navegação — 21/10/2026

## Pedido e recorte

Meus links como contexto padrão; substituir Clientes; reduzir a aba Página; reaproveitar a prévia do editor no histórico; corrigir o overflow de Descobrir páginas; destacar requisitos de comparação de botões. Complemento: cards de páginas seguem truncamento e expansão dos cards de links, com Seguir à esquerda e Ver página primário à direita. Alterações locais na branch codex/roadmap-f37-testes, sem commit/push/deploy. Árvore já continha alterações de outras tarefas; preservar sua autoria e conteúdo.

## Decisões e alternativas

- Meus links é a primeira opção e fallback da navegação em conta/rotas comuns; deep links preservam o contexto da rota. Forçar toda entrada para /painel prejudicaria favoritos e links compartilhados; não adotado.
- Outras páginas explica o contexto sem exigir entender agência ou cliente. A lista chama Páginas que gerencio. Mantidos /painel/clientes, IDs e contratos para não quebrar URLs ou autorização. Renomear tabelas/endpoints seria migração sem benefício para este pedido.
- Apresentação mantém nome, endereço, foto, descrição e restrição etária; Busca e filtros, Formulário e Descoberta ganham seções/rotas próprias. Grupos e links, Aparência e Visão geral continuam. Recursos da página agrupa essas três opções na sidebar. Reutilizado ResponsiveTabs, que troca abas por seletor quando não cabem; não criados novos dropdowns.
- O editor compartilha o mesmo rascunho, autosave, proteção de saída e prévia ao trocar de seção. O atalho antigo /dados#formulario-contato ainda escolhe formulário. Publicação e restauração continuam explícitas; trocar uma aba não publica. Permissões existentes de contatos e edição continuam verificadas.
- Histórico usa ProfileDevicePreview com frame iphone nas duas versões, igual à prévia ao vivo. Fotos removidas continuam indisponíveis; retenção/restauração não alteradas. Não criada outra implementação de preview.
- Descoberta recebe colunas minmax(0,1fr) e limites de min-width no contêiner, corrigindo a expansão por min-content. Filtros expandidos limitam categorias longas à largura disponível no componente compartilhado. Não escondido overflow no body.
- Cards usam CardTitle e CardDescription existentes: título em uma linha com ellipsis e descrição em duas linhas, Ver mais/Ver menos quando necessário. A grade passa de mínimo 280 para 360px (limitado à largura da tela); botões não quebram a linha. Seguir é secundário, Ver página primário. Quando já segue, o rótulo visual é Seguindo e o nome acessível/tooltip permanece Deixar de seguir, para manter os dois botões legíveis em 320px. A ação de deixar de seguir mantém a autorização e estado confirmados pelo servidor.
- Requisitos para iniciar comparação recebem fundo amarelo, borda, ícone e nome acessível. Regras de plano, medição e amostra permanecem no backend. Não foi usado somente cor para transmitir o aviso.

## Como conferir

1. Abra /painel/conta: Área do painel começa em Meus links. Escolha Outras páginas para gerenciar acessos autorizados; não concede acesso a outra conta por si.
2. Em Minha página, use Apresentação, Grupos e links, Aparência, Busca e filtros, Formulário e Descoberta. Em telas menores, use Seções da minha página. Faça mudanças e confira autosave e prévia.
3. Abra Histórico de versões → Ver diferenças: as duas prévias usam a moldura iPhone compartilhada. Restaurar continua pedindo confirmação.
4. Abra /paginas: categorias e resultados ficam dentro da tela; digitar e parar busca automaticamente. Descrição longa oferece Ver mais/Ver menos; título não aumenta a altura; Seguir/Ver página ficam lado a lado.
5. Abra Comparar botões com teste configurado e sem plano/medição habilitada: requisitos ficam amarelos e iniciar continua bloqueado.

Sem novas dependências, variáveis de ambiente ou migrations. Reiniciar os servidores locais se novas rotas não forem reconhecidas. Backend teve apenas rótulo de seção de permissão, sem mudança da regra comercial.

## Validação

Frontend: lint, typecheck, build e 207 testes em 53 arquivos aprovados. Backend: lint, typecheck, build e quatro testes de permissões aprovados; o recorte de backend é somente rótulo. Regressão Playwright final: 25 aprovados, incluindo setup, em desktop/mobile. Rodada adicional dos cards: três aprovados, incluindo setup, com fonte ampliada a 200%. [Resumo auditável](evidencias/refino-paginas-2026-10-21/execution-summary.json) e [evidências/comandos](evidencias/refino-paginas-2026-10-21/README.md).

A primeira rodada aprovou cinco de sete casos e encontrou categoria longa expandida maior que a tela e seletor de teste ambíguo durante streaming. A segunda aprovou 43 de 49 e identificou expectativas antigas de rótulo, URL e submenu de navegação; atualizadas para os fluxos atuais. A terceira aprovou 19 de 25 e revelou overflow da camada invisível de medição de ResponsiveTabs, que também deslocava diálogos no viewport mobile e bloqueava cliques. A camada voltou a ter largura do contêiner e overflow somente nela; não foi escondido overflow do body. A correção já presente na árvore compartilhada foi sincronizada na cópia isolada e revalidada: 25/25. Capturas finais examinadas, incluindo título/descrição, botões em 320px, aviso e moldura do histórico; o ajuste adicional dos cards permite quebrar rótulos em fonte ampliada sem cortar os controles, mantendo os dois botões na mesma linha.

Chromium real via Chrome DevTools: DOM, estilos, respostas do BFF e console consultados. Nenhum erro/aviso de console na consulta do editor; diagnóstico confirmou que restringir a medição invisível eliminava o excesso de largura. Playwright cobriu 320/390/768/1280/1440/1920px na descoberta, teclado/foco, falha de rede, permissões, restauração, autosave e Axe nas regiões exercitadas. Teste automatizado não certifica acessibilidade total. Nenhum baseline visual foi atualizado automaticamente.

Validação em cópia temporária sem .env, portas próprias e containers descartáveis do harness, offset 180: web 3180, API 3513, stub 4279, PostgreSQL 5613, Redis 6560. Containers removidos ao encerrar; banco pessoal, credenciais reais, produção e envs do Coolify não alterados. Sem env/migration adicional para testar localmente. Builds mantêm avisos preexistentes de CSS start/end e plugin Next não detectado no ESLint; compilação concluída.

## Reversão e limites

Reverter somente os trechos desta revisão nos componentes de navegação, editor, discovery, comparação, rótulos e testes; remover as três novas rotas se revertido. Não usar reset da árvore compartilhada nem desfazer migrations anteriores. Não há alteração em produção, aparelho físico ou validação de todas as áreas do produto por este recorte.
