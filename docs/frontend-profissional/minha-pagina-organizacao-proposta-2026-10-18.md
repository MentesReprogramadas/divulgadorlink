# Minha página: proposta de organização — 18/10/2026

Estado: diagnóstico e proposta, sem alteração da aplicação. Escopo: editor autenticado `/painel/perfil`, não a página pública `/p/[slug]`.

Atualização: a direção abaixo foi substituída pelo pedido seguinte do usuário: nova aba Visão geral como entrada, cards de compartilhamento e ações, barra ao lado das abas com excedente nos três pontos. O documento mantém o diagnóstico inicial; não representa o layout implementado posteriormente.

## Evidência e limites

Lidos `profile-editor.tsx`, `profile-editor-actions.ts`, `profile-fields.tsx`, `profile-group-manager.tsx`, `profile-group-actions.tsx`, `profile-link-list.tsx`, `checklist-screen.tsx` e navegação do painel. Inspecionadas visualmente as capturas desktop/mobile em `evidencias/minha-pagina-aprovacao-2026-10-17/published-header-*.png`. Essas capturas antecedem algumas ações hoje presentes no código. O acesso real a localhost:3000/painel/perfil retornou o formulário de login, sem sessão autenticada; não foi validado o editor atual em execução nem produção. Refero indisponível entre as ferramentas desta sessão.

## Diagnóstico priorizado

| Prioridade | Evidência | Efeito provável | Correção e aceite |
| --- | --- | --- | --- |
| Alta | `profileEditorActions` oferece importar, modelos, histórico, métricas e checklist simultaneamente, antes das abas. | Pessoa precisa distinguir edição, acompanhamento e manutenção antes de começar. | Distribuir ações pela tarefa; localizar importação em Links e modelos em Aparência sem percorrer um menu genérico. |
| Alta | Endereço/compartilhamento, banner de alterações, ferramentas e navegação precedem o formulário; mobile empilha ferramentas, abas e prévia. | Conteúdo de trabalho perde espaço na primeira tela. | Cabeçalho compacto e ações contextuais; conferir primeiro grupo e ação de criação em 390×844, sem erro/banner excepcional. |
| Média | QR Code e prévia usam tratamento primário, enquanto Publicar aparece em outro bloco quando há mudanças. | A prioridade visual varia por função e por estado. | Publicar é a ação de maior destaque quando aplicável; prévia e compartilhamento secundários. |
| Média | Grupo aberto mostra editar, remover e adicionar; cada link repete agendar, editar, remover e alça. | Repetição aumenta ruído conforme a lista cresce. | Editar visível; demais ações em menu contextual nomeado, preservando alternativa ao arraste e confirmações. |
| Média | Checklist é uma ferramenta independente no mesmo nível das demais. | Ajuda para começar compete com a manutenção cotidiana. | Apresentar uma próxima etapa baseada nos estados reais do checklist, com acesso à lista completa; não inventar novas exigências. |

Risco de abandono é hipótese coerente com a densidade observada no código; não há medição de abandono ou frequência de uso nesta análise.

## Layout proposto

Direção: área de trabalho clara, identidade navy existente, superfícies neutras, títulos objetivos e separação por tarefa. Manter cabeçalho compartilhado e sidebar global; não acrescentar outra sidebar ao editor. Não usar uma grade de atalhos antes do conteúdo nem converter todas as ferramentas em novas abas.

**Desktop:** cabeçalho do editor com título, estado real, Compartilhar e Ver prévia. Uma linha de navegação separa Editar de Resultados. Dentro de Editar, três seções: Links, Identidade e Aparência. Corpo ocupa a largura útil com grupos reconhecíveis; grupo aberto usa lista compacta. Publicação fica numa única faixa inferior contextual, com resumo de alterações, acesso a descartar e Publicar. Faixa sticky apenas quando cabe sem cobrir conteúdo/foco; reservar espaço e testar zoom. Não adicionar prévia permanente nesta primeira etapa: ela reduz a largura de edição e cria outro foco de atenção.

**Mobile:** título e estado curtos; mesma arquitetura de destinos. Três seções de edição visíveis se couberem com texto ampliado, usando fallback acessível se necessário. Uma coluna; botão Adicionar grupo próximo ao título Links; ao abrir grupo, Voltar aos grupos e Adicionar link. Compartilhar abre uma folha/modal com endereço completo, copiar e QR Code. Publicação segue próxima da área alcançável com o polegar; teclado virtual, safe area e zoom podem exigir posicionamento no fluxo. Não criar segunda barra de navegação fixa competindo com o menu global.

| Ação atual | Local proposto | Condição preservada |
| --- | --- | --- |
| Adicionar grupo / Adicionar link | Cabeçalho da seção / grupo aberto | Criação em diálogo, sem inserir registro vazio ao cancelar |
| Importar links | Ação secundária em Links | Salvar rascunho antes de sair, mantendo tratamento de falha |
| Botão principal / Canais de acesso | Opções de organização em Links, com rótulos explícitos | Seleção atual, disponibilidade e regras do servidor |
| Modelos | Aparência | Não aplicar modelo silenciosamente nem perder alterações |
| Nome, endereço, descrição, foto e idade | Identidade | Endereço publicado continua somente leitura; idade visível nesta seção |
| Métricas | Resultados, destino separado do formulário | Mesma rota e dados existentes; navegação por links, não falsas tabs |
| Checklist | Orientação contextual + acesso à lista completa | Estados e obrigatoriedade vindos do backend |
| Histórico | Opções da página | Mesmo destino e persistência antes de navegar |
| Atualizar dados | Controle discreto junto do estado | Preservar confirmação sobre alterações locais; não remover sem teste |
| Copiar / QR Code / Abrir página | Compartilhar | URL publicada real; não apresentar rascunho como público |
| Ver prévia | Cabeçalho, secundário | Flush confirmado antes de navegar; falha conserva edição |
| Publicar | Uma faixa de publicação contextual | Validação, pending, revisão, conflito e autorização atuais |
| Descartar | Acesso secundário na faixa de alterações | Restaura publicação; indisponível antes da primeira publicação |
| Retirar do ar | Opções da página, ação destrutiva separada | Confirmação e rascunho preservado |

## Fluxos

- Primeira criação: Identidade → criar grupo e primeiro link → prévia → publicar. Aparência e modelos opcionais; sem reintroduzir assistente obrigatório. Próxima etapa derivada do checklist existente.
- Manutenção: entrar em Links → abrir grupo → editar/adicionar → conferir prévia quando necessário → publicar alterações. Salvar automaticamente continua diferente de publicar.
- Compartilhamento: Compartilhar → copiar endereço ou QR Code da publicação. Edições não publicadas não mudam esse destino.
- Acompanhamento: Resultados → métricas → voltar à edição conservando contexto. Sem métricas, mostrar estado vazio honesto.
- Revisão/erro: manter motivo, ação corretiva e contestação acessíveis junto da publicação; não esconder bloqueios ou recusa no menu de opções.

Atalhos prioritários são acessos diretos e rótulos claros. Preservar `secao=links`, `secao=pagina` e `secao=aparencia`, URLs das ferramentas e retorno ao grupo. Não acrescentar atalhos globais de teclado antes de verificar conflitos; Enter não pode publicar por acidente.

## Referências e decisões

- [Linktree Help Center](https://linktr.ee/help/en): fonte documental de separação entre conteúdo, design, compartilhamento e resultados. Fundamenta agrupamento por tarefa; não se afirma inspeção do dashboard interno nem se copia sua identidade.
- [NN/g — Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/): fundamenta expor opções secundárias sob demanda e manter o caminho evidente. Aplicação: menus nomeados por contexto, sem esconder editar, adicionar ou impedimentos de publicação.
- Capturas reais locais e padrões de grupos/coleções do próprio produto: fundamentam preservar reconhecimento dos grupos e continuidade de navegação. As capturas inspecionadas são históricas, não prova da renderização do código mais recente.

## Matriz de risco e execução

| Rota | Público / tarefa | Estado crítico | Regra / risco |
| --- | --- | --- | --- |
| /painel/perfil | Dono / editar | Vazio, rascunho, publicado, alterações | Autosave, conflito, versão e tenant |
| /painel/perfil/previa | Dono / conferir | Flush pendente ou falho | Privacidade e mesmo renderizador público |
| /painel/perfil/canais | Dono / organizar acesso | Disponível ou restrito | Não inferir elegibilidade pela apresentação |
| /painel/perfil/metricas | Dono / acompanhar | Sem dados ou falha | Não fabricar resultados ou ampliar rastreamento |
| /p/[slug] | Visitante / acessar links | Publicado, restrito por idade, indisponível | Fora da reorganização do editor |

Lote 1: cabeçalho, navegação e redistribuição das ferramentas; preservar persistência e rotas. Lote 2: ações contextuais de grupo/link e fluxo de foco. Lote 3: orientação inicial e publicação por estado. Cada lote depende da validação do anterior; não alterar cobrança, revisão, permissões ou analytics para viabilizar o layout.

Aceite: executar tarefas de criar, editar, publicar e compartilhar em desktop/mobile; validar teclado, Escape, retorno de foco, zoom de 200%, 320 px, nomes longos e erros. Não usar hover como único acesso. Testar publicação pendente/recusada, falha de rede, conflito, descarte, conteúdo oculto e página sem publicação. Rodar lint, typecheck, testes afetados, build e E2E quando houver implementação. Comparar descoberta de ações e conclusão de tarefas em teste com usuários antes de afirmar melhora de conversão.

Esboço responsivo: `minha-pagina-layout-proposta-2026-10-18.html`; dados ilustrativos, sem conexão ou ações reais. Inspecionado no Chrome em 1440×1000 e 390×844, sem overflow horizontal; verificação adicional de largura em 320 px também sem overflow. Isso valida somente a composição ilustrativa, não a jornada, teclado completo, contraste ou zoom da aplicação. Lint, build e E2E não executados porque não houve alteração executável na aplicação. Para reverter esta entrega, remover somente este documento e o HTML. Nenhum arquivo da aplicação ou dependência foi modificado; alterações preexistentes em output foram preservadas.
