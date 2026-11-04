# Destaque com compra na própria página — especificação aprovada

Estado: aprovada pelo usuário e implementada em 04/11/2026 na branch `codex/destaque-pos-cadastro`, sem commit, push ou deploy. Esta especificação substitui as decisões de apresentação do funil de 02/11, preservando as regras comerciais que não foram alteradas expressamente. Evidências: [validação da implementação](../../frontend-profissional/evidencias/destaque-compra-na-pagina-2026-11-04.md). Autor: Codex, a pedido do usuário.

## Objetivo

### Ajustes aprovados após a implementação

- Pagamento concluído remove cronômetro, título promocional e introdução da oferta; apresenta a confirmação do pagamento.
- Neste modal de saída, remover X e fechamento por Escape/backdrop; a saída explícita é o texto centralizado “Sair sem destacar”, abaixo de Comprar. Preservar navegação após confirmação.
- “Agora não” na oferta pós-cadastro usa texto pequeno centralizado, mantendo foco visível e alvo de toque acessível.
- Alinhar separadores e dígitos do cronômetro sem deslocamentos manuais ou animação dos separadores.

Após cadastrar um link, entender imediatamente que existe 20% de desconto para destacá-lo e iniciar o pagamento na mesma página. Prioridade mobile. A oferta inicial deixa de ser modal; a intervenção de saída passa a existir somente na jornada de escolha de destaque.

## Decisões solicitadas

1. Cadastro concluído: substituir o conteúdo do formulário pela oferta, remover stepper e formulário; manter header e navegação compartilhados. Sem modal inicial ou de segunda oferta ao dispensar essa página.
2. Título explícito: “Destaque seu link com 20% OFF”. Sucesso do cadastro é confirmação curta, secundária. Mostrar nome do link, espaços, duração, referência, preço final e economia.
3. Banner abaixo do header: “Oferta por tempo limitado”, cronômetro grande. Cor de atenção âmbar somente no prazo; desconto/economia e benefício continuam verdes. Sem mensagens inventadas de estoque, visitas ou vendas.
4. Home é opcional e reversível: card inteiro selecionável, checkbox visível. Selecionar e desmarcar recalcula espaços e total. Seleção não elimina o componente; estado selecionado tem “Home adicionada” e ação “Remover”.
5. CTA único “Comprar por R$ …”. Não usar “Quero o pacote Completo”, nem abrir outro checkout interno. Pix e Cartão ficam junto do total, na página.
6. Fechar a oferta inicial leva a Meus links e disponibiliza recuperação abaixo do header. Não apresenta o modal de saída imediatamente.
7. Recuperação global recolhível: faixa compacta com desconto, relógio e Expandir. Expandida, mostra pacote, total, Recuperar oferta e “Ocultar aqui”. Ocultar remove a faixa das demais áreas, mantendo a oferta no painel, sem fechar/remover ali, enquanto válida e elegível.
8. No painel, o aviso persistente pode ser recolhido/expandido, mas não dispensado. Ele desaparece após compra, expiração ou perda de elegibilidade. Não fica indefinidamente após o prazo.
9. Card de link: título/metadados → métricas → botão Destacar este link → ações Ver resultado, Editar, Disponibilidade e Acessar. Remover o disclosure Mais opções; manter regras de disponibilidade/permissão das ações.
10. Minha página na primeira criação: Criar com ajuda primeiro (esquerda no desktop, acima no mobile), depois Criar do meu jeito. Manter grant independente do assistente e estados de acesso.
11. Na tela de destaque, escolher pacote/duração e tentar sair pode abrir um modal de recuperação de 20%, curto e direto, com o pacote escolhido, relógio, pagamento e CTA Comprar. Nunca abrir por simples troca de plano, ao comprar ou ao sair da oferta inicial.

## Caminhos propostos

### A. Pós-cadastro

Enviar cadastro → oferta ocupando a página → Pix já marcado → Comprar → QR/Pix copia e cola na mesma página. Com Home, tocar no card e Comprar: duas ações comerciais, sem contar o envio do cadastro.

Cartão → campos Stripe na própria página → Comprar. A meta de até duas ações vale para selecionar método e iniciar/confirmar o pagamento com dados preenchidos. Digitação, validação, autenticação 3DS e ações exigidas pelo banco não podem ser eliminadas nem prometidas como dois cliques. Não gerar cobrança ao simplesmente selecionar método ou Home.

Estado de pagamento preserva valor, pacote e ID do pedido. Desabilitar o CTA enquanto gera; repetir/recarregar retoma o pedido pendente, sem duplicar cobrança. Em erro, manter seleção e oferecer nova tentativa. Sucesso depende de confirmação do servidor, não do cliente.

### B. Dispensa da página inicial

Agora não → Meus links com faixa abaixo do header. Nenhum modal de segunda oferta. Expandir → detalhes; Recolher → compacto; Ocultar aqui → ausente fora do painel, persistente no painel. Recuperar oferta abre a mesma experiência de pagamento integrado para aquele link, sem reiniciar o prazo.

### C. Escolha de destaque e tentativa de saída

Destacar este link → escolher pacote/duração → tentar Voltar ou navegar para outra rota interna → modal de saída. Modal: “Seu destaque com 20% OFF”, espaços e duração escolhidos, referência/preço/economia, prazo, Pix/Cartão e Comprar. “Sair sem destacar” sempre disponível, sem culpa ou impedimento.

Uma apresentação por intenção de saída/campanha/sessão; fechar o modal não abre outro. Não usar beforeunload para imitar modal personalizado ao fechar aba; navegadores não permitem isso de forma confiável. Se a saída já estiver concluída, recuperar pela faixa, sem tentar prender o navegador.

## Pacotes e complemento

| Seleção base | Complemento possível | Remover devolve para |
| --- | --- | --- |
| Busca | Nicho + Home | Busca |
| Nicho | Busca + Home | Nicho |
| Busca + Nicho | Home | Busca + Nicho |
| Home | Busca + Nicho | Home |
| Completo escolhido diretamente | Nenhum | Não aplicável |

Ao atingir Completo por complemento, manter a origem e o card selecionado para poder remover. Ao escolher Completo diretamente no catálogo, não mostrar complemento. Esse estado distingue a origem da seleção, sem mudar o contrato de superfícies enviado ao servidor.

Para +18: Home é proibida na UI e na API, inclusive em combinações, renovação, retomada e replay. Busca pode adicionar Nicho; Nicho pode adicionar Busca; Busca + Nicho não tem complemento. Não exibir Completo ou cobrar por Home.

## Desconto, prazo e elegibilidade

- Valor sempre vem do catálogo/cotação do servidor; nenhuma tabela de preço nova na apresentação.
- 20% aplicado uma única vez; oferta de saída não acumula mais 20% sobre um preço já promocional. Se houver campanha ativa para o link, reutilizar preço/prazo da campanha.
- Prazo padrão proposto permanece 24h absoluto e intervalo de 30 dias por conta/tenant. Números nas maquetes são exemplos estáticos identificados no board.
- Nova capacidade proposta: campanha de saída também pode ser emitida para link elegível mais antigo, após seleção e tentativa de saída, em vez de ficar limitada ao cadastro nas últimas 24h. Exige evolução explícita da regra de emissão no backend; não alterar silenciosamente a campanha atual.
- Se houver oferta ativa de outro link ou cooldown, não prometer 20% que a API não pode conceder. Mostrar somente oferta efetivamente emitida. A oferta existente continua vinculada ao seu link.
- Preparar a oferta antes de mostrá-la; evitar flash de preço cheio ou modal anunciado sem cotação válida.
- Ao expirar: relógio em zero, sem comprar com a cotação vencida. Informar “Oferta encerrada”, mostrar preço atual após confirmação; nunca criar nova promoção automaticamente ao recarregar.
- Aprovação e ativação automáticas após confirmação do pagamento seguem a configuração já autorizada; preservar demais restrições de conta, tenant, verificação, suspensão e bloqueios.

## Design e animação

Fonte de verdade: navy/turquesa do sistema, Outfit em títulos e Source Sans 3 em texto; tokens atuais de status-success e status-warning. Raios 6/12/16px, botões de pelo menos 44px (Comprar: 52px), foco visível e controles nativos equivalentes na implementação.

Mobile: primeira dobra com banner, desconto explícito, nome do link, preço, complemento reversível, método e Comprar. Evitar cartões redundantes e explicações longas. Card Stripe expande em fluxo; rolagem para o campo não pode esconder o total. Desktop: mesma ordem de leitura; complemento, método e Comprar juntos à direita, sem desviar para outra página.

Cronômetro: HH:MM:SS, algarismos tabulares. Proposta de troca vertical/opacity só dos dígitos alterados, 160ms ease-out, sem piscar, sacudir o banner ou mudar largura. Reduced motion: troca instantânea. Leitor de tela não anuncia cada segundo; prazo absoluto e expiração são acessíveis. Animação está descrita na spec e nos estados do board; telas estáticas não provam animação funcionando.

## Estados que os desenhos devem cobrir

- Pós-cadastro na página, Home desmarcada e marcada com Remover.
- Cartão expandido no mesmo conteúdo; Pix gerado; confirmação do pagamento.
- Faixa abaixo do header compacta, expandida e ocultada fora do painel; persistente no painel.
- Card de Meus links reorganizado e criação de Minha página com assistente primeiro.
- Tela manual de destaque e modal de saída preservando pacote/duração; cartão no modal.
- +18 sem Home/Completo; prazo encerrado; falha de pagamento/retomada.
- Desktop e mobile nos pontos principais.

## Critérios de aprovação e validação futura

O usuário aprova a spec e os desenhos antes de qualquer implementação. Não há mudança de frontend/backend neste lote, nem nova dependência, commit, push ou deploy.

Na implementação futura: testar seleção reversível, cotação/desconto não cumulativo, elegibilidade/isolamento/+18, idempotência, confirmação e expiração, dispensa global versus painel, gatilho de saída sem loop, grants de Minha página. Executar checks dos pacotes afetados e E2E das jornadas, teclado/foco, 320/390/1440px, zoom e contraste. Conversão é hipótese, exige medição posterior.

## Entrega de design

Arquivo de referência existente: https://www.figma.com/design/AJ6XQpNqDuOA4iZqNevZy4/

O conector retornou limite de chamadas do plano Starter durante esta tarefa. Não foi contratado upgrade. Em seguida, o usuário pediu substituir Figma por FigCraft. A entrega passou para FigCraft local 0.12.1, com MCP oficial configurado e validado via initialize, tools/list, edição, inspeção e gravação.

Entrega: `output/destaque-v2-2026-11-04/Tem-Link-Aqui-destaque-v2.figcraft`, três boards com 20 telas/estados, camadas vetoriais e textos editáveis (sem screenshot como fundo). Previews PNG exportados pelo próprio FigCraft. O arquivo foi aberto no aplicativo e identificado na árvore de camadas. Os controles desenhados não constituem protótipo navegável nem pagamento funcional; animação está especificada em estados estáticos.

O servidor `figcraft` foi adicionado a `C:/Users/ferna/.codex/config.toml` com backup do arquivo anterior, sem modificar os demais servidores. Executável instalado: `C:/Program Files/ArtCraft/FigCraft/figcraft-cli.exe`. Modo headless, restrito à pasta dos desenhos para leitura e gravação; aplicativo abre o arquivo salvo para revisão. Recarregar o Codex pode ser necessário para disponibilizar a nova ferramenta na sessão.

Outfit e Source Sans 3 foram obtidas do repositório oficial Google Fonts, com licenças OFL preservadas na pasta dos desenhos, e registradas como fontes do usuário local para renderização fiel. A inspeção do documento confirmou somente essas duas famílias. Nenhuma dependência do site foi alterada.
