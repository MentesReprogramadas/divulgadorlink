# Design System — proposta fundamentada

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
