# Grupos e acessos unificados — 18/10/2026

Implementado localmente por solicitação do usuário. Sem branch, commit, push ou deploy. Mudanças locais anteriores preservadas. A proposta está em [diagnóstico e jornada](../../grupos-canais-fluxo-unificado-2026-10-18.md).

## Resultado

Minha página → Grupos e links → criar/abrir grupo → Adicionar link ou Adicionar acesso à comunidade. Grupos com acessos usam o mesmo gerenciador dos demais grupos. O acesso aceita endereço diretamente, sem cadastro prévio nem outra aba; selecionar convite existente é opcional. Editar, ordenar, remover e pausar permanecem dentro da jornada do grupo. As URLs anteriores de canais continuam disponíveis por compatibilidade.

Referência consultada: [Carbon — Toggle](https://www.carbondesignsystem.com/building-blocks/core/components/toggle/guidelines), para estado binário e rótulo persistente. O switch foi solicitado pelo usuário e altera a prévia local imediatamente; salvar/publicar conserva a aplicação existente do rascunho à página pública. Nenhum componente ou identidade externa foi importado.

“Mostrar texto do botão” existe somente no editor de acessos e começa desligado nos novos registros. Nesse estado, o botão público mostra rede e ícone; texto opcional continua disponível para gestão. Canais anteriores sem essa configuração preservam sua exibição. O usuário pode ativar o texto e conferir a prévia local. Links comuns conservam seus títulos e não recebem esse controle. O aviso “Canais indicados pelo responsável. Conteúdo e participantes podem variar.” foi removido por instrução explícita do usuário, superando essa parte da apresentação documentada na F37. Não foi acrescentada promessa de equivalência.

## Contratos e implementação

- O editor integrado sincroniza o autosave do perfil antes da leitura e da gravação do grupo; PUT usa a versão confirmada. Falha e conflito mantêm os campos no diálogo.
- Criação de destino reutiliza F12, incluindo chave de idempotência. Depois de criar um destino, repetir a gravação do grupo não cria outro endereço. Alterar a URL cria uma fonte para aquele acesso e preserva usos do endereço anterior.
- O merge recebe os IDs dos canais anteriores para preservar links comuns e suas posições. Não converte um link comum em canal por reutilização de ID. Ordenação dos canais e identidade dos itens são preservadas.
- Destinos próprios pendentes ou recusados podem permanecer no rascunho. Aprovação, revisão ativa, correspondência de rede, isolamento e disponibilidade continuam exigidos para a publicação e a saída pública. Nenhuma aprovação é concedida pelo frontend.
- `showLabel` é metadata opcional do canal: acompanha publicação, histórico e restauração. Ausência mantém exibição antiga. O novo GET `/me/profile/channel-destinations/:id` retorna somente fonte do proprietário/tenant, situação e redes compatíveis; não publica dados privados.
- Sem dependências, lockfiles ou migrations alterados nesta etapa. Cobrança, limite de oito alternativas, consentimento, métricas, idade e autorização permanecem nos contratos existentes.

Arquivos principais: `features/profile-channels/{profile-access-editor,channel-dialog,use-channel-source,channel-choices,channel-contract}`, `features/profiles/{profile-editor,components/profile-group-manager,components/profile-link-list,components/profile-view}`, e domínio/repositórios/rotas de perfis no backend. Inventário completo: `output/group-access-unified/files.json`.

## Validação

| Verificação | Resultado |
| --- | --- |
| Frontend lint e typecheck, incluindo E2E | Aprovados após a implementação |
| Frontend unitários e componentes | 347 aprovados, em 105 arquivos, na rodada final |
| Frontend build | Aprovado; também recompilado pelo setup da rodada E2E final |
| Backend lint, typecheck e build | Aprovados |
| Backend unitários e contratos sem PG | 545 aprovados |
| Domínio de canais + PG real de canais, perfis e histórico | 45 aprovados na rodada final |
| Playwright Chromium desktop 1280×720 e mobile emulado 390×844 | 12/12 aprovados, sem retry ou skip |
| Revisão visual | Capturas de grupo misto, texto ligado/desligado, falha recuperável, pendente e zoom examinadas |
| Teclado e foco | Escolha pública por Enter, toggle por Espaço, retorno ao disparador após salvar, diálogos e seleção de rede |
| Acessibilidade automática | Axe nas superfícies e estados cobertos, sem violações na rodada final; aguarda opacidade final dos diálogos antes da medição |
| Zoom/reflow | 320 px com texto a 200%, sem overflow horizontal da página; diálogo rolável e salvamento utilizável nessa condição |
| Diagnóstico Chrome DevTools | Sessão sintética separada; DOM, formulário, switch desligado, console sem erros/avisos e contraste de textos examinados; desktop também inspecionado em 1440×900 |

Os textos do diálogo estável usam contraste de 15,80:1 (principal) e 5,43:1 (secundário) sobre branco, calculado a partir dos estilos computados. Esses valores não certificam toda a aplicação. Em 320 px com texto a 200%, o cabeçalho longo quebra em várias linhas; o formulário continua rolável e utilizável.

O E2E comprova criação sem convite anterior, grupo misto, nova tentativa sem fonte duplicada, persistência do toggle, edição da URL com ID estável, pausa aplicada após publicação, pendência recuperável após reload, bloqueio de publicação inelegível, permissões, saída assinada e histórico/restauração. Testes de componente também cobrem endereço sem texto preenchido, usando a rede validada como identificação interna.

Ambiente descartável: offset 12000, web 15000, API 15333, stub 16099, PostgreSQL 17433, Redis 18380; containers com sufixo `group-access-unified`, removidos pelo teardown. Portas e processos locais anteriores não foram encerrados. Sem acesso a serviços de cobrança ou envio reais. Logs em `output/group-access-unified/{playwright-verified,pg-final,frontend-tests}.log`. O build mantém avisos preexistentes de workspace/lockfiles e CSS `start/end`; o diff check dos arquivos desta etapa passou. O diff check global aponta uma linha vazia preexistente em CSS de descoberta, fora deste escopo.

## Capturas

| Estado | Desktop | Mobile |
| --- | --- | --- |
| Grupo com link comum e acesso | [Grupo](grupo-desktop.png) | [Grupo](grupo-mobile.png) |
| Acesso sem texto personalizado | [Público](publico-sem-texto-desktop.png) | [Público](publico-sem-texto-mobile.png) |
| Acesso com texto personalizado | [Público](publico-com-texto-desktop.png) | [Público](publico-com-texto-mobile.png) |
| Edição e toggle | [Editor](editar-acesso-desktop.png) | [Editor](editar-acesso-mobile.png) |
| Erro recuperável | [Erro](erro-recuperavel-desktop.png) | [Erro](erro-recuperavel-mobile.png) |
| Destino pendente | [Rascunho](pendente-desktop.png) | [Rascunho](pendente-mobile.png) |
| 320 px e texto a 200% | [Zoom](zoom-desktop.png) | [Zoom](zoom-mobile.png) |

## Reversão e limites

`output/group-access-unified/implementation.patch` registra a alteração desta etapa, comparada com cópias anteriores para os arquivos que já tinham edições locais. Reverter somente esses trechos e remover os novos componentes/testes, preservando o restante do trabalho local; não usar reset global. O skeleton possui apenas a remoção da antiga propriedade de navegação de canais.

Se já houver dados com `showLabel`, manter o leitor que aceita esse campo e a preservação de links comuns durante uma retirada da interface nova: voltar ao parser estrito anterior pode impedir a leitura da metadata. Nenhum dado real foi migrado ou regravado por esta validação; os dados de ensaio estavam no banco descartável.

Não houve teste em aparelho físico, liberação em produção ou medição de conversão. A área antiga de Convites continua existindo para gestão independente de endereços permanentes. Recursos ainda em análise dependem da decisão real do backend.
