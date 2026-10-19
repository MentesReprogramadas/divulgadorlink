# Grupos e canais: diagnóstico e proposta de fluxo unificado

Data: 18/10/2026. Proposta baseada em código, testes existentes, especificações F12/F37 e histórico. Não altera aplicação nem contratos comerciais. Interface atual não foi inspecionada em sessão autenticada nesta análise; o navegador de diagnóstico disponível estava em about:blank. Não representa validação de usabilidade com usuários.

Atualização após aprovação: a implementação foi executada localmente, incluindo remoção do aviso público e toggle exclusivo dos acessos, desligado por padrão nos novos registros. O diagnóstico abaixo registra o estado anterior. [Resultado implementado, validação e capturas](evidencias/grupos-acessos-unificados-2026-10-18/README.md).

## O propósito e a origem da separação

Grupo organiza conteúdo da página. Canal representa uma alternativa de acesso, identificada por rede, que o visitante escolhe: por exemplo, WhatsApp, Telegram ou site de uma comunidade. Não distribui visitantes automaticamente nem garante que comunidades tenham os mesmos participantes ou conteúdo.

Convite é o nome da área de links permanentes: um endereço compartilhável com destino atualizável. A F37 reutilizou a F12 para validar destinos, preservar revisões e retirar alternativas inelegíveis. A decisão D39 em `docs/planejamento-features/execucao-f37.md` escolheu selecionar convites próprios já aprovados e editar seus destinos na área Convites. A dependência é deliberada; a necessidade de navegar por áreas separadas é uma escolha da experiência atual.

O histórico consultado registra a consolidação no commit a0aff73. Não permite atribuir intenção de UX além das decisões documentadas.

## Evidências e impacto

| Achado observado | Evidência | Impacto e prioridade | Correção proposta e aceite |
| --- | --- | --- | --- |
| A entrada de canais é secundária no menu de opções | `profile-group-actions.tsx` e `profile-editor-toolbar.tsx` | Alta: recurso difícil de descobrir | Criar/configurar pelo mesmo formulário de grupo, acessível pela ação principal |
| Grupo comum e grupo de canais abrem editores diferentes | `profile-group-manager.tsx` e navegação em `profile-editor.tsx` | Alta: tarefas semelhantes mudam de contexto | Abrir todos os grupos no mesmo editor; identificação clara do conteúdo |
| Grupo exige três etapas; cada canal abre outro formulário de duas etapas | `channel-group-editor.tsx` e `channel-dialog.tsx` | Alta: percurso longo para poucos campos | Lista de acessos no grupo com inclusão e edição locais, sem assistentes encadeados |
| Incluir canal exige selecionar convite aprovado; criação abre outra aba | `channel-dialog.tsx` e vazio de `channel-group-editor.tsx` | Alta: usuário precisa conhecer e concluir outra funcionalidade | Campo de endereço no contexto do grupo, usando a validação existente por trás; reutilização de convite como opção secundária |
| Canal referencia uma revisão específica do convite | `projectChannelGroups` em `backend/src/domain/profiles/profile-channels.ts` | Alta: substituir a revisão pode retirar uma alternativa da página | Edição integrada apresenta validação e vínculo atualizado explicitamente; nunca migrar revisão ou rede silenciosamente |
| Pausar e salvar alteram rascunho; publicação aplica a mudança | `channel-group-editor.tsx`, `channel-dialog.tsx` e regras F37 | Média: salvar pode parecer aplicação imediata | Estado “Alteração ainda não publicada”, prévia e publicação pela mesma jornada |

## Jornada proposta

**Minha página → Grupos → Adicionar grupo → Adicionar conteúdo → Prévia → Publicar.**

1. O formulário do grupo começa com título e visibilidade. Uma explicação curta apresenta o uso: “Organize seus links e ofereça formas de entrar na sua comunidade.”
2. Dentro do grupo, “Adicionar conteúdo” oferece intenções concretas: adicionar link ou adicionar acesso à comunidade. Exemplo do segundo: “WhatsApp, Telegram ou site: o visitante escolhe onde entrar.”
3. Adicionar acesso pede endereço e texto do botão no próprio editor. A rede pode ser sugerida a partir do endereço, mas somente a correspondência validada pelo servidor confirma a identificação. Não pedir cadastro prévio na área Convites.
4. “Usar um convite existente” fica como alternativa para quem já tem um. A criação de um destino novo utiliza o serviço e as proteções existentes da F12, sem duplicar validação ou aprovação.
5. A lista do grupo concentra edição, ordenação, remoção e pausa; cada acesso mostra rede e situação retornada pelo servidor. Estados de validação devem explicar a ação necessária, sem chamar uma aprovação anterior de garantia de disponibilidade.
6. Salvar mantém o rascunho; a prévia e a publicação continuam pertencendo à página. Alterações pendentes de validação permanecem recuperáveis, com a restrição de publicação explicada quando aplicável.
7. Para trocar um endereço, o usuário edita o acesso no grupo. O sistema coordena a revisão do convite e o vínculo do canal, informa o que ainda depende de validação/publicação e preserva a versão pública conforme as regras existentes.

“Canais de acesso” deixa de ser uma tarefa paralela obrigatória. Convites continua disponível para uso independente de endereço permanente e QR Code. A unificação é da jornada; não elimina esses recursos.

## Matriz de tarefas e riscos

| Superfície | Público/tarefa | Regra e estados | Risco a verificar |
| --- | --- | --- | --- |
| `/painel/perfil`, grupos | Dono cria/edita grupo e acessos | Rascunho versionado; vazio, carregamento, erro e conflito | Perda de edição ou gravações concorrentes entre perfil e canais |
| `/painel/perfil/canais` e detalhes | Dono acessa URL existente | Entrada compatível para o grupo correspondente | Quebrar URLs e contratos existentes |
| `/painel/convites` | Dono gerencia endereço permanente | Validação, revisões e aprovação existentes | Alteração compartilhada afetar outros usos do convite sem explicação |
| Prévia e publicação | Dono confere e publica | Elegibilidade e moderação atuais | Mostrar sucesso antes da persistência ou permitir publicação inelegível |
| `/p/:slug` e saída de canal | Visitante escolhe acesso | Rede correta, idade, disponibilidade e tokens | Expor destino inelegível ou alterar métricas/consentimento |

## Entrega incremental e questões de contrato

Primeiro integrar a descoberta, criação e edição de grupos na mesma superfície, reutilizando os endpoints atuais e preservando caminhos antigos. Depois integrar criação/edição de destino via F12 no contexto do grupo, com estados recuperáveis e coordenação de versões. Por fim validar a jornada completa, prévia/público e edição de convites compartilhados.

O formulário atual distingue grupos comuns e grupos de canais; `mergeChannelGroup` substitui os itens do grupo por seus canais. Portanto, permitir links comuns e acessos no mesmo grupo exige evolução explícita do contrato e testes de preservação. Não converter grupos existentes automaticamente nem presumir que apenas mover o formulário permite misturar conteúdos.

A API atual oferece apenas fontes aprovadas para seleção. Criar um destino ainda pendente dentro da jornada exige coordenar seu estado com o rascunho, sem vinculá-lo como aprovado ou relaxar publicação. O desenho técnico dessa coordenação precisa ser fechado na implementação. Não prometer inclusão instantânea no público.

Manter limite atual de oito alternativas, isolamento de proprietário/tenant, suspensão, moderação, idade, tokens de saída, analytics e consentimento. Não alterar automaticamente vínculos de outras páginas ao atualizar um convite compartilhado.

## Critérios de aceite

- Usuário sem convite prévio cria e configura o acesso sem sair do grupo ou abrir outra aba.
- Usuário identifica o propósito antes de preencher e consegue editar os acessos no mesmo lugar.
- Endereço inválido, revisão pendente/recusada, indisponibilidade e falha de rede têm orientação e preservam o preenchimento.
- Troca de destino não deixa referência antiga silenciosamente; testes cobrem aprovação, vínculo, publicação e usos compartilhados.
- Links/grupos existentes, IDs, ordem, histórico e URLs permanecem preservados; mistura ou conversão tem contrato explícito antes de ser habilitada.
- Desktop/mobile, teclado, foco, zoom e estados são inspecionados no navegador; Playwright cobre criação até saída pública e recuperação de falhas.
- Na implementação: lint, typecheck, testes afetados e build do frontend; checks do backend quando alterado. Nenhum teste foi executado nesta etapa documental.

Reversão desta entrega: remover apenas este documento. Alterações locais preexistentes foram preservadas; nenhuma branch, commit, dependência ou deploy foi criado.
