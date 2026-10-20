# Design System — proposta fundamentada

## Select em modal — 17/10/2026

O Select compartilhado mantém o portal no dialog ancestral e usa posicionamento fixo nesse contexto, para o popup não aumentar a área rolável do modal. O positioner acompanha a largura do campo, limitado ao espaço disponível; a lista ocupa 100% do positioner e concentra sua própria rolagem vertical. Fora de modais, o posicionamento permanece absoluto. Não limitar somente o positioner e deixar o popup com uma largura maior independente. [Diagnóstico, capturas e regressão](evidencias/minha-pagina-grids-selects-2026-10-17/README.md).

## DatePicker personalizado — 17/10/2026

`components/ui/date-picker.tsx` substitui todos os campos nativos de data/data e hora do financeiro, resultados de destaque, acessos de convites e editor administrativo de destaque. Calendário pt-BR, digitação `dd/mm/aaaa` (com `hh:mm` quando aplicável), Hoje/Limpar, seleção destacada e contorno para hoje. Valores do transporte continuam ISO e o horário permanece local, sem conversão dentro da primitiva. A feature mantém a conversão e as regras existentes.

O popover reutiliza Base UI já instalado, com portal dentro do dialog ancestral quando necessário. Não foram adicionadas dependências. Calendário usa grid com um dia no percurso de Tab, setas, Home/End, PageUp/PageDown e Shift para anos. Escape fecha e devolve foco; datas inexistentes bloqueiam a validação do formulário. Selecionar pelo calendário também comunica a alteração ao Field para remover erros corrigidos.

Referências: [Carbon Date Picker](https://www.carbondesignsystem.com/building-blocks/core/components/date-picker/guidelines) fundamenta campo com calendário contextual e distinção entre digitar e selecionar; [W3C APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/) fundamenta grade, teclado, anúncio de mês e retorno de foco. Mantidos navy, tokens e tipografia locais. Refero não está disponível entre as ferramentas desta sessão. Stories em `Design System/Campos/DatePicker`.

Evidências e limites em [validação do DatePicker](evidencias/date-picker-2026-10-17.md).

Estado: fundações aplicadas após autorização do usuário e verificação do piloto. A matriz abaixo registra a direção e sua evolução; os valores executáveis estão em frontend/src/styles/primitives.css e tokens.css. A identidade anterior foi avaliada criticamente, não preservada por obrigação.

## Diagnóstico crítico inicial

Há uma base navy/turquesa, mas também papel/esmeralda/argila e três famílias de fonte. Isso exige definição de papéis; não prova, sozinho, que a combinação seja ruim. Os controles já têm altura mínima de 44 px e foco visível. Há valores locais fora dos tokens e regras globais de main/form que obrigam exceções por contexto. O Field atual mostra dicas e erros sem um contrato próprio de ids/aria-describedby. A identificação de anúncio usa texto de 10 px e cor discreta: medir contraste e legibilidade antes de propor correção.

Sem capturas atuais de todas as rotas, não declarar uma auditoria visual completa nem escolher uma identidade final. A decisão visual do piloto deve comparar a interface real com as referências e apresentar um alvo renderizável.

## Referências consultadas e adaptação

| Fonte primária | Padrão estudado | Adaptação para o produto |
| --- | --- | --- |
| [Atlassian — spacing](https://atlassian.design/foundations/spacing/) e [typography](https://atlassian.design/foundations/typography/) | Escalas e papéis de texto coerentes | Estruturar tokens e densidade; não importar suas fontes ou marca. |
| [GOV.UK — error summary](https://design-system.service.gov.uk/components/error-summary/) | Erros acionáveis ligados aos campos | Formular recuperação e vínculo acessível nos formulários longos; adaptar a linguagem para pt-BR. |
| [Carbon — data tables](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines) | Tabelas como estrutura para dados e ações | Pedidos/administração: leitura e comparação, com ações contextuais, em vez de transformar todos os dados em cards. |
| [Linktree](https://linktr.ee/) | Comunicação dirigida a quem publica um link | Avaliar clareza de proposta e próximo passo. Não copiar cores, composição, promessas de receita ou confundir catálogo com link-in-bio. |
| [Linear — features](https://linear.app/features) | Agrupamento de capacidades por tarefa | Organizar conteúdo e rótulos por objetivo. A página pública não comprova a UX do dashboard interno; não usar como evidência de densidade do painel. |

Pesquisa textual/documental realizada em 15/10/2026. Não houve inspeção de screenshots dessas referências nesta etapa. O piloto deverá incluir análise visual real. Refero não é requisito exclusivo; sua última chamada retornou assinatura inativa. Não há autorização para comprar assinatura ou usar geração paga.

## Direção candidata

Uma linguagem de catálogo confiável, orientada à leitura e à ação. Navy sustenta identidade e ação principal; turquesa pontua identidade com texto escuro, sem virar cor de sucesso ou fundo de toda a interface. Superfícies claras, títulos sem efeitos decorativos e metadados legíveis. O detalhe memorável deve vir do produto: mostrar claramente como URL, tema e rede se tornam uma entrada organizada, usando conteúdo permitido e exemplo identificado como ilustrativo.

Para /divulgar, priorizar proposta, custo real, condição de publicação e próximo passo. Não acrescentar depoimentos, números, urgência, marcas ou garantias sem evidência. Mockups de catálogo são exemplos e não métricas reais.

## Camadas de tokens

| Camada | Exemplos propostos | Regra |
| --- | --- | --- |
| Primitivos | neutral-0…950, brand-navy, brand-turquoise, space-1…16 | Valores e escalas; neutros e estados podem ser ajustados após contraste. |
| Semânticos | surface-page, surface-raised, text-primary, text-secondary, border-default, action-primary-bg, focus-ring, status-error-text | Descrevem função; componentes consomem estes tokens. |
| Componente, se necessário | button-padding-inline, table-row-gap | Somente quando a API visual recorrente justificar; sem alias para cada propriedade. |

Candidatos de partida: branco #ffffff; navy #0a192f; turquesa #4af9eb; texto #14241c; superfície atual #f3f6f4. Comparar superfície atual com neutral mais neutro no piloto. Não declarar qualquer combinação aprovada antes de medir contraste. Estados de sucesso/atenção/erro têm texto, ícone quando útil e semântica própria; não reutilizar o destaque de marca como aprovação.

## Tipografia e geometria propostas

| Área | Candidato | Justificativa |
| --- | --- | --- |
| Texto e controles | Source Sans 3, 16 px, entrelinha 1,5 | Já disponível; leitura e manutenção consistentes. |
| Títulos de produto/marca | Outfit, pesos 500–700 | Diferencia hierarquia sem terceira família obrigatória. |
| Source Serif 4 | Removida do carregamento; alias anterior agora usa Outfit | A revisão real mostrou ganho de coerência entre catálogo e área de conta; contratos CSS foram mantidos. |
| Escala | 12, 14, 16, 20, 24, 32, 40/48 px em rem; display fluido limitado | Variação por função; 12 px só em metadados secundários, nunca informação crítica. |
| Texto longo | Aproximadamente 60–70ch | Sustenta leitura; validar português e zoom. |
| Espaçamento | 4, 8, 12, 16, 24, 32, 48, 64 px | Reutilizar base útil e dar ritmo previsível. |
| Controles | Mínimo de projeto de 44 px; compacto apenas com contexto e teste | Facilita toque sem espalhar formulários. |
| Raios | 6 px em controles, 12 px em superfícies e 16 px na ilustração da landing; pill em chips | Escala refinada durante o piloto e aplicada por função. |
| Sombras | Baixa elevação para superfícies sobrepostas | Separação visual sem sombra decorativa em todos os cards. |

Não mudar todas as fontes para a opção da referência. Usar next/font, reduzir pesos realmente carregados e medir impacto; sem bibliotecas de ícones ou fontes adicionais por conveniência.

## Containers e responsividade

| Contexto | Máximo candidato | Comportamento |
| --- | --- | --- |
| Formulário curto | 28rem | Campo legível e ação próxima, sem esticar em desktop. |
| Leitura legal | 65ch | Coluna de leitura, títulos com ritmo consistente. |
| Landing | 72rem | Uma coluna no mobile; composição em duas áreas somente quando o conteúdo justificar. |
| Catálogo | 80rem | Grade adaptável que preserva nomes e hierarquia de patrocinados. |
| Painel/admin | 90rem | Densidade para comparação; tabela com overflow contido quando necessário. |

Gutters candidatos: 16 px mobile, 24 px tablet, 32 px desktop. Grids usam minmax(0, 1fr), gaps tokenizados e breakpoints derivados da quebra do conteúdo; 48rem/64rem são pontos de partida, não exigência de dispositivos. Não limitar todo main a 640 px. Não forçar cards onde uma lista ou tabela representa melhor a tarefa.

## Catálogo mínimo e contratos

| Família | Variantes/estados documentados | Critério |
| --- | --- | --- |
| Button / ButtonLink | primary, secondary, ghost, danger; default, hover, focus, disabled e loading quando ação async | Link não finge estar desabilitado sem bloquear navegação; loading não muda largura abruptamente. |
| Field, Input, Select, TextArea | padrão, dica, obrigatório, inválido, disabled, readOnly quando aplicável | label associado, ids previsíveis, aria-describedby e erro acionável. |
| Navegação | atual, foco, overflow e mobile | aria-current, ordem de tab e saída previsíveis; não esconder ação essencial. |
| Card / CatalogLink | orgânico/patrocinado, conteúdo longo, metadados ausentes | Identificar publicidade e manter destino/contexto. Não adicionar hover em card sem interação. |
| Tabela/lista | carregamento, vazio, erro, seleção/ordenação se existentes | Cabeçalhos e caption acessíveis; ordenar não inventa funcionalidade. |
| Feedback | loading, erro recuperável, vazio com próximo passo e sucesso | role=status/alert conforme urgência; não depender de cor. |
| Dialog | aberto, envio, erro, conclusão e cancelamento | Título acessível, foco contido e devolvido; ação destrutiva claramente identificada. |

Documentação de cada componente: propósito, quando usar/não usar, API, variantes, estados aplicáveis, teclado, responsividade, exemplo e teste. Nem todo componente precisa de todos os estados async; justificar não aplicáveis.

## Registro de decisões do piloto

| Decisão candidata | Fonte | Benefício esperado | Evidência para aceitar |
| --- | --- | --- | --- |
| Uma ação primária, derivada da sessão | advertiseCta e briefing | Reduzir incerteza sobre o próximo passo | Links corretos nos três estados e ação encontrada no mobile. |
| Separar publicação gratuita de destaque pago | Contrato comercial | Evitar percepção de cobrança obrigatória | Revisão de conteúdo e percurso sem checkout antes de publicar. |
| Texto curto e informação progressiva | Pesquisa de produto e copywriting | Facilitar leitura sem esconder condições | Capturas, leitura em zoom e entendimento do fluxo. |
| Dois papéis tipográficos predominantes | Auditoria local + escala Atlassian | Coerência entre marketing e produto | Comparação visual e custo de fontes sem regressão. |
| Erro ligado ao campo | GOV.UK | Recuperação mais rápida e acessível | Teste de teclado e vínculo acessível. |

Aumento de conversão é hipótese. Medir chegada → cadastro → verificação → envio com os eventos reais existentes; registrar gaps antes de propor eventos novos. Comparar coortes/canais e período equivalentes, com denominador explícito e consentimento preservado. Screenshot aprovado não comprova ganho comercial.

## Componentes das áreas privadas — 16/10/2026

O refinamento vigente estabelece título único da página, ações sem card alinhadas à direita, card de filtros e resultados em seguida. O pedido mais recente substitui a composição anterior de ações em card. Não adicionar descrição genérica nem contagem repetindo o estado vazio. Ações por item ficam no próprio card. Condições comerciais, erros e contexto necessário continuam disponíveis.

| Componente | Contrato e uso |
| --- | --- |
| WorkspaceActions | Ações da tarefa sem fundo, borda ou padding de card, alinhadas à direita e com ícones. Uma ação isolada recebe tratamento primário; destrutivas preservam sua cor. Sair aparece em vermelho no cabeçalho global desktop e como última ação no rodapé da sidebar mobile, sem duplicação no conteúdo das telas. |
| WorkspaceFilters | Grid responsivo de controles; dois primeiros ficam visíveis no mobile e os demais abrem com Ver mais, acima de Ver menos. Valores e formulário permanecem montados ao recolher. Não carrega dados nem decide autorização. |
| Select | Base UI 1.9.0 sem tema externo; superfície/trigger/opções locais. Preserva label, name, required, disabled, valor inicial/controlado e grupos. Teclado, Escape e retorno de foco precisam funcionar também dentro de diálogo. |
| Tabs / TabNavigation | Tabs relacionadas à mesma tarefa, indicador de seleção animado, teclado e movimento reduzido. Links de mudança de área continuam sendo links, não tabs. |
| ResponsiveTabs | Na gestão, mede a largura real das tabs, incluindo ícones e fontes. Se não couberem em uma linha, usa o mesmo Select personalizado, preservando a área escolhida. |
| Field | Asterisco vermelho ao lado do label para required, sem mudar seu nome acessível; feedback local de validade nativa ao sair/enviar. Mensagens do servidor continuam sendo autoridade para regras comerciais e permissões. |
| EmptyState | Um único bloco com ícone decorativo e mensagem curta; ação opcional dentro do bloco. Não repetir contador zero nem um segundo aviso de vazio. Falha de carregamento usa ErrorState. |
| FormSteps | Só a etapa atual expõe seu texto visual; as demais usam círculo e número. Rótulos completos continuam acessíveis. Faixa única no mobile, com quebra do texto atual em zoom quando necessário. |
| ImageUpload | Seleção/arraste, prévia e remoção; preserva a normalização e validações existentes. O upload não publica a imagem sozinho. |
| OverlayDialog | Native dialog com foco contido, Escape, fundo inerte, devolução de foco e bloqueio de rolagem. Variante sidebar desliza da direita; não cria navegação duplicada na página. |
| FavoriteButton | Estrela amarela sem fundo; contorno antes de salvar, preenchimento somente após sucesso. Ícone 24 px com alvo 44 px. Erro e pendência preservam o estado confirmado no servidor. |

As variantes podem ser exploradas em `components/ui/primitives.stories.tsx`. Evidências de integração e critérios de fechamento ficam em `implementacao.md`; stories isoladas não comprovam o servidor.


## Carregamento, navegação mobile e prévia — 17/10/2026

- A sidebar mobile abre pela direita. Logo e botão Menu ocupam as extremidades do cabeçalho, com margem de 16 px. Os destinos Catálogo, Busca, Painel e Admin aparecem antes do contexto: uma coluna no catálogo/busca, duas no painel/admin. Compartilham SidebarLink com os itens internos; saída vermelha permanece no rodapé.
- SkeletonRegion anuncia o carregamento uma vez e mantém as formas internas inertes e ocultas da árvore acessível. Skeleton respeita movimento reduzido. As composições reutilizam grids, cards, campos, hints e dimensões dos componentes reais; não emitem impressões, cliques ou IDs falsos de catálogo.
- Cada loading do painel recebe o caminho literal do destino. Não deduzir a tela pendente pelo pathname anterior: isso pode mostrar o resumo ao mudar de aba. Atualizações do mesmo recurso mantêm os dados; troca de recurso, erro e perda de autorização têm estados próprios.
- Button mantém conteúdo e dimensões durante envio, com spinner sobreposto. O Select aceita ícone decorativo sem alterar o label ou o valor. Rede e Assunto do link usam ícones também dentro do controle.
- O nome de navegação é Minha página. Ver prévia salva o rascunho e só navega após confirmação. `/painel/perfil/previa` usa a sessão e projeção privada existentes, o mesmo ProfileView da publicação e banner sticky Modo de prévia com Voltar à edição. Não publica o rascunho nem recebe outro proprietário na URL.
- Não aplicar Suspense de página antes da verificação de existência de recursos públicos: isso inicia HTTP 200 e pode mascarar o 404. Páginas SSR estáticas chegam completas; skeletons cobrem espera assíncrona real. Quantidades e comprimentos desconhecidos dos dados não têm equivalência pixel a pixel garantida.

## Página pessoal e personalização — 17/10/2026

Por pedido expresso, `/p/:slug` e a prévia privada usam página inteira sem chrome do catálogo. O SiteShell acompanha o pathname também nas transições; o conteúdo público continua sendo renderizado no servidor. Essa exceção não muda as demais rotas.

- ProfileView compartilha publicação, prévia privada e simulação inerte no editor. Fundo cobre a viewport; coluna de links até 600 px, com foto, nome, bio e grupos. Assinatura pequena Criado por com logo original, sempre no rodapé, com contraste próprio. Não há configuração para ocultá-la.
- Aparência separada de Conteúdo; personalização dividida em Temas, Cores e Botões e texto. Simulação lateral no desktop e abaixo dos controles no mobile. Conteúdo mantém as etapas anteriores. Só a publicação explícita atualiza a página pública.
- Seis temas curados, cores hex, sólido/degradê suave, botões preenchidos/contorno/sombra, retangular/arredondado/cápsula, tipografia moderna/clássica/simples e alinhamento. Cor do texto deriva do contraste; degradê varia na direção que mantém a leitura. Valores são allowlisted no cliente e validados no servidor, sem CSS livre.
- ColorPicker é controlado por `label`, `value` e `onChange`. Disclosure próprio, paleta, código hex e canais RGB. Não usa input color nativo. Enter/Espaço abrem; Tab percorre e setas/Home/End ajustam os sliders. Hex incompleto permanece local, com erro associado, e não altera a cor aplicada. Mudança de tema reconcilia o campo. Story em Design System/Personalização/ColorPicker.
- ImageUpload mantém seleção/arraste e prévia. prepareAvatar reduz a até 512 px e converte para WebP antes do transporte; backend decodifica e reencoda sem metadados, preservando mídia PNG legada e autorização existente.

Escopo, referências, limites e evidências em [Minha página](minha-pagina-personalizacao.md).

## Complemento — marca e revisão de conteúdo, 17/10/2026

A assinatura passou a texto de 9 px e logo de 66 px, sem cápsula ou fundo, no rodapé da página e da prévia. Os quatro snapshots Windows foram comparados e aprovados após inspeção: as diferenças estão restritas à marca. A publicação de Minha página e Convites agora usa decisão automática ou fila humana por categoria, motivo de recusa e uma contestação por envio, por novo pedido expresso. As regras anteriores de bloqueio editorial definitivo foram superadas; bloqueios técnicos de segurança continuam obrigatórios. Histórico desta personalização permanece acima.

Contrato, migração, critérios, resultados (229 unitários frontend, 436 backend, 46 PostgreSQL, 44 E2E e duas jornadas visuais), limites e reversão em [Revisão de páginas e convites](revisao-paginas-convites.md). Na primeira entrega a revisão destes tipos ocorria no admin. O pedido seguinte ampliou a decisão para WhatsApp, registrado no complemento do mesmo documento.

## Política de interação em áreas compartilhadas — 19/10/2026

InteractionPolicy é uma primitiva de interação sem transporte/autorização: Button bloqueia ações de escrita por padrão quando a composição declara somente leitura. Ações classificadas de leitura usam readOnlyAllowed (consulta, atualização e download). Filtros e navegação permanecem utilizáveis; checkbox de preferência não pode ser alterado. A feature fornece a política baseada no contrato de acesso do servidor. Isso não concede direitos na API. Destaques administrativos têm contexto independente da escrita em Gestão e um destino próprio para consultar o link sem acesso à lista de usuários.

## Contatos, distribuição e assistente — 19/10/2026

Refinamento posterior: [fluxos guiados e prévia compartilhada](../planejamento-features/refinamento-f22-f23-f25.md). ProfileEditingLayout compõe a simulação inerte nas quatro abas de edição, lateral em desktop e expansível no mobile; o skeleton compartilha essa composição. Checkbox nativo tem dimensão própria de 20px, margem zerada, accent/foco com tokens e política de somente leitura, sem herdar field (48px). Configuração de contato usa a mesma largura dos dados; busca ocupa card próprio na aba Página. Cartões manual/assistente aparecem somente antes da primeira página, com recomendação textual e borda sem depender apenas da cor.

F22/F23/F25 compõem Field/Input/Select/Button, WorkspaceActions, FormSteps, Badge, estados e skeleton existentes em CSS Modules próprios. Ações do painel à direita, filtros em superfície própria, listagem antes da configuração em modal. Assistente tem atividade → links → revisão, seleção explícita dos campos e prévia com ProfileDevicePreview; editar exige atualizar a prévia antes de aplicar. Nenhuma alteração é publicada nessa confirmação.

Manter apenas tokens existentes: space-6, surface-subtle e text-xl. A inspeção encontrou referências inexistentes a space-5/surface-muted/text-2xl e as corrigiu nas novas composições, preservando o restante da folha global. Read-only consulta sugestões com readOnlyAllowed, sem geração/descarte/aplicação. [Evidências e limites](../planejamento-features/execucao-f25.md): capturas desktop/mobile, 1440/768/390, reflow 320px/200%, teclado, foco e Axe nos escopos alterados. Não equivale a certificação global nem aprovação automática de novos baselines.

Complemento do formulário público: Field aceita align=center mantendo start como padrão. Checkbox tem variante page baseada nas variáveis do tema; conserva input nativo, foco visível e fallback de cores forçadas. ContactForm centraliza campos/rótulos, usa a mesma fonte, cores, cantos e botão da página e aparece na simulação do editor. Metadados vêm do GET de prévia existente; falha tem retry e cancelar configuração restaura a simulação salva. Não há envio na prévia nem mudança nas regras de retenção/aceite.
