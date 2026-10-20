# Fluxos guiados de convites, contatos e criação da página

Pedido de 19/10/2026: tornar F23 compreensível sem explicação externa; depois oferecer contatos na criação/edição e visão geral da página e apresentar escolha manual/assistida somente antes de criar a página. Sem Git/push/deploy autorizados. Preservar alterações locais anteriores e regras do servidor.

## F23 — decisão de experiência

A explicação anterior de exigir um endereço principal e outros dois convites era restritiva: o contrato aceita um destino, e a identidade pública não deve ser apresentada como um grupo adicional que o usuário precisa adivinhar. O fluxo agora começa na lista de Convites, com Distribuir convites → endereço de entrada → convites que recebem visitas → divisão → conferência explícita. Um endereço de entrada e um destino são suficientes; outros destinos podem ser adicionados depois. A mesma URL pública é preservada.

Divisão igual é a opção inicial; prioridades ficam numa opção própria. A conferência mostra endereço público, URLs dos destinos, percentuais aproximados, pausas e ausência de destinos disponíveis. O destino original da entrada não é incluído automaticamente, conforme regra existente, e isso é informado antes da ativação. Não inferir lotação, ingresso ou conversão a partir de encaminhamentos.

Cadastro de convite é oferecido no fluxo com RedirectFields e as rotas F12 existentes: mesma validação/moderação, recurso reservado para correção e identidade de retry. Cadastro não ativa distribuição. Cancelar mantém os convites já escolhidos; convite em revisão permanece fora das opções aprovadas. Não se cadastram endereços extras silenciosamente. Alternativas rejeitadas: exigir dois destinos; duplicar automaticamente o convite original; alterar a API para permitir autorreferência; exibir peso numérico como primeira escolha.

Componentes novos têm responsabilidades concretas: PoolEntryDialog orienta e escolhe entrada; PoolSetupForm escolhe/revisa; CreatePoolInvite compõe o cadastro F12 sem abandonar o formulário. Reutilizam OverlayDialog, FormSteps, Select, Pagination e ações existentes. Listas longas são paginadas e a troca de etapa reposiciona o diálogo. A abertura por configurar=1 é consumida uma vez para evitar reabrir configuração em reload.

Referências consultadas: [GOV.UK Check answers](https://design-system.service.gov.uk/patterns/check-answers/) fundamenta a conferência editável antes de confirmar; [WAI formulários em etapas](https://www.w3.org/WAI/tutorials/forms/multi-page/) fundamenta progresso e divisão por tarefas. A identidade visual continua a do projeto. Refero permanece sem assinatura ativa conforme ferramentas.md; nenhuma biblioteca instalada.

## F22/F25 — complemento autorizado

Implementado: opção de contato em Dados da página, acessível desde a criação manual, e atalho Receber mensagens na visão geral. Nome/endereço válidos são necessários para criar o rascunho antes de configurar o formulário; abrir a configuração primeiro aguarda esse salvamento. ContactSettingsForm compartilha a configuração em etapas, enquanto ContactSettingsPanel coordena transporte/versionamento. Erro mantém os campos e retry não informa sucesso antes da resposta do servidor. A caixa Contatos recebidos continua dedicada à consulta/exportação/exclusão e aponta para a edição da página.

Para uma conta sem página, a visão geral oferece Criar do meu jeito e Criar com ajuda, com ícones, descrições e borda Recomendado no assistente. Nenhuma geração começa ao abrir o cartão. Após criação, a edição permanece nas páginas de dados/grupos/aparência; o assistente saiu da seção Edição da sidebar. A rota/API existente permanece disponível conforme os direitos independentes de assistant, inclusive para equipes sem page; o cartão sem esse grant não navega. Não foi criada uma rota artificial de edição.

Direitos contacts/page/assistant continuam independentes, com autorização no servidor. Exceção necessária: colaborador global com contacts mas sem page.write configura pela caixa de contatos, preservando seu direito anterior sem liberar a página. Compartilhamento legado não ganha acesso aos contatos. Não foi incorporado o formulário à publicação versionada da página: em página publicada, salvar configuração continua atualizando o formulário imediatamente; a UI informa essa regra. Alternativas rejeitadas: esconder configuração exclusivamente na caixa de respostas; conceder contacts automaticamente a quem edita página; misturar as duas gravações numa transação de publicação nova.

## Complemento: controles e prévia nas abas

Corrigido o defeito do modal: Input recebia a classe global field e sua altura mínima de 48px, indevida em checkboxes. Checkbox é uma primitiva nativa de 20px, com cor/foco pelos tokens existentes e política de somente leitura. Foi adotada nos formulários de contato e nas opções da página; labels/linhas têm alinhamento e quebra por espaço disponível. Campo e Obrigatório permanecem lado a lado quando couberem; em telas estreitas/texto ampliado, quebram sem comprimir o checkbox. Sem biblioteca de componentes nova.

Exibir busca na minha página mudou de Aparência para Página, dentro do card Busca e filtros, com ícone, rótulo e orientação de publicação. Mantém appearance.searchEnabled e preserva a escolha ao trocar temas. Nenhuma mudança na busca pública ou nas regras de publicação.

ProfileEditingLayout compõe uma única ProfileDevicePreview nas abas Visão geral, Grupos e links, Página e Aparência, reutilizando ProfileView. O conteúdo vem diretamente do rascunho em memória: nome, descrição, grupos/links, cores e busca acompanham a edição antes do autosave. A prévia permanece inerte, sem navegação, envio ou medição de visita. Desktop tem coluna lateral ampliada; mobile tem painel expansível/recolhível acima dos controles, mantendo o rascunho montado. Complemento do usuário: moldura com proporção de iPhone (393:852), cantos/câmera e rolagem interna com foco de teclado. A altura não cresce com o conteúdo da página. O modo fluid antigo permanece apenas nos consumidores de comparação/assistente, para evitar mudar esses fluxos por consequência desta melhoria. A primeira escolha manual/assistida não exibe uma simulação vazia. Skeleton usa a mesma composição de colunas. A prévia completa existente continua disponível. A simulação lateral carrega os metadados do formulário pelo GET de prévia já existente, sem substituir o rascunho em memória. Alterar a configuração atualiza a simulação imediatamente; cancelar restaura a configuração salva. Falha na consulta oferece retry de leitura e preserva a edição. A identificação sintética da simulação nunca é gravada nem usada para envio.

Alternativas consideradas: duplicar renderer em cada aba; manter prévia apenas em Aparência; colocar um telefone fixo cobrindo o formulário no mobile. Escolhida composição comum, sem novo endpoint ou consulta ao provedor. O painel mobile é recolhido inicialmente para preservar espaço de edição; pode ser aberto sem sair da aba.

## Validação

F23: 16 testes unitários afetados; Playwright final 21/21, incluindo F12 em desktop/mobile. Primeira rodada 19/21 encontrou reabertura indevida do diálogo no reload, corrigida e coberta por regressão. Evidências finais em docs/frontend-profissional/evidencias/f23-guiado-2026-10-19/final; falha inicial preservada em falha-inicial.

F22/F25: primeira rodada de integração 43/43 antes do complemento de checkboxes/busca/prévia. Após esse complemento, lint/typecheck aprovados e frontend completo 436/436 (129 arquivos). Rodada ampla 55/57: os dois casos G03 revelaram ausência do formulário salvo na prévia lateral. O endpoint bruto /preview não inclui esse bloco; corrigido para /preview/items, já utilizado pela prévia completa. Nova rodada específica final: 13/13 em desktop/mobile, com build atualizado, centralização, aceite opcional pelo teclado nos seis temas, validação sem POST inválido, rolagem interna da prévia, alteração/cancelamento e alinhamento do modal em 320px/200%. Inspeção visual das capturas finais registrada no manifesto. Sem alterações de backend, dependências, envs, dados pessoais ou migração neste refinamento. Build de produção é executado pelo harness em .next-e2e; PostgreSQL/Redis descartáveis próprios. Não somar rodadas sobrepostas nem declarar provedor real/produção validados.

Reversão da fatia: retirar os novos pontos de entrada e a composição lateral, restaurando os componentes de edição anteriores e preservando contratos/tabelas/rascunhos. Não usar reset do workspace, que contém alterações anteriores do usuário. Mantém 29/42 implementações locais e F28 não iniciada. Sem nova branch, commit, push ou deploy.


## Roteiro de teste local

1. Convites → Distribuir convites: escolher/cadastrar o endereço compartilhável, escolher/cadastrar destinos, dividir por igual ou priorizar e conferir antes de ativar. Um destino basta; pausar todos torna a entrada indisponível.
2. Sem página, Minha página: escolher Criar do meu jeito ou Criar com ajuda. O recomendado não gera nem publica sozinho. Depois de criada, editar pelos menus existentes.
3. Página: informar nome/endereço, abrir Configurar formulário, ativar, escolher campos e salvar. Conferir pré-requisito e falha recuperável. Visão geral → Receber mensagens retorna a esse card; Contatos recebidos consulta respostas.
4. Conferir Busca e filtros em Página, ausente de Aparência. Ativar busca; mudar tema; voltar e confirmar preservação. Publicar continua sendo a ação que altera o conteúdo público.
5. Editar nome/descrição, grupos/links e cores nas abas e observar a simulação local. No mobile, expandir/recolher a prévia sem perder campos. A prévia completa separada continua sendo o ensaio dos recursos carregados pelo servidor.
6. No modal, usar Tab/Espaço nos checkboxes e voltar entre etapas; conferir 20px, foco e alinhamento. Em leitura, os controles de escrita permanecem bloqueados.

Nenhuma env nova é necessária para este refinamento. As configurações/migrations originais de F22/F23/F25 permanecem necessárias, conforme as execuções de cada feature. Não executar o harness contra banco pessoal: ele gerencia seus próprios containers. O ensaio pago/real do assistente não faz parte destes testes.


### Correções durante a regressão ampliada

Axe encontrou uma falha real na nova área rolável da prévia: sem foco no contêiner e com filhos inertes, o teclado não podia rolar. Corrigido com região nomeada/focável na tela do telefone; links e envio continuam inativos. Cobertura unitária de tabindex e repetição Axe, sem exclusões de regras.

Duas falhas eram do teste: Axe procurava [role=dialog] apesar de o componente usar dialog nativo; navegação sintética com goto interrompia o autosave antes de verificar a persistência da busca. Usar dialog e aguardar o estado saved corrige a medição. O assert de foco do grupo foi delimitado ao formulário Editar perfil, pois agora o mesmo título também aparece na simulação. O teste de Aparência passa a abrir a prévia recolhida no mobile antes de exigir visibilidade. O gesto de DnD centraliza o card antes de arrastar: a nova composição lateral mudou a altura da página e alinhar o handle no topo acionava autoscroll durante um gesto com coordenadas fixas. Mantidos os asserts de ordem/persistência e o comportamento de autoscroll, sem modificar a lógica de ordenação da aplicação.


## Formulário público e complemento final

O mesmo ContactForm aparece na página pública e na prévia. Cores, fonte, cantos, campos, foco e botão seguem as variáveis do tema, inclusive outline/shadow e contraste no tema escuro. Validação local reaproveita os limites e formatos do contrato existente: obrigatórios, e-mail, telefone e comprimentos; foca o primeiro erro, preserva valores e evita chamada inválida. O servidor continua sendo a autoridade. A prévia permanece sem envio.

Pedido final: formulário, rótulos e campos centralizados; removido o parágrafo de retenção dessa apresentação; rótulo reduzido a Quero receber novidades. Checkbox nativa com variante page acompanha o tema, tem foco de teclado e fallback forced-colors. Continua opcional e desmarcada inicialmente. Retenção de 180 dias, processamento e contrato de consentimento não foram alterados. Alternativas consideradas: manter checkbox visual do painel; criar controle simulado sem semântica nativa; marcar aceite automaticamente. Escolhida variante tipada da primitiva existente, mantendo os demais consumidores com estilo padrão. Field ganhou alinhamento opcional center, sem alterar o padrão start.

## Isolamento da regressão

Uma rodada foi contaminada por outra execução simultânea no mesmo checkout: portas diferentes não isolam state.json, build, PID e relatórios. O log collision e o JSON sobrescrito foram preservados como diagnóstico, sem contabilizar seu resultado como aceite. Adicionada reserva atômica antes de Playwright limpar artefatos, herança pelos workers, recuperação de PID encerrado e liberação pelo dono. Teardown verifica filiação antes de encerrar o servidor. Três testes com processos reais cobrem exclusão e recuperação; uma tentativa concorrente real foi rejeitada sem mudar fixture/PID. Nenhum processo alheio foi encerrado.


Fechamento: lint, typecheck, build de produção do harness, 436 testes frontend, 3 testes de reserva E2E e 13 casos E2E finais aprovados. A rodada ampla de 57 casos fica comprovada pelo log (55 aprovados e 2 falhas corrigidas); seu relatório/capturas temporários foram substituídos pela rodada específica e não são apresentados como manifesto preservado. Não somar rodadas sobrepostas. Relatório final e capturas da rodada específica estão preservados. Sem produção, aparelho físico ou provedores reais validados; S7 remoto permanece pendente.
