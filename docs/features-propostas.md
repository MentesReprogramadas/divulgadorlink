# Features propostas para evolução do Divulgador Links

Estas propostas ampliam o Divulgador Links para demonstrar o resultado das divulgações, estimular o retorno dos visitantes e melhorar a qualidade do catálogo e oferecer perfis e páginas personalizadas. Status: propostas registradas para avaliação; implementação ainda não autorizada. Registro em 14 de outubro de 2026.

# Ordem sugerida de implementação

Prioridade atualizada em 15 de outubro de 2026: F42, integração com a Evolution para moderação e alertas no grupo, é a primeira feature. As demais mantêm seus IDs e seguem a sequência consolidada do planejamento.

1. Moderação e alertas operacionais no grupo pela Evolution API (F42).

2. Relatório de resultado do destaque.

3. Lembrete de renovação.

4. Links relacionados.

5. Denúncias e acompanhamento de disponibilidade.

6. Favoritos e coleções.

7. Painel de oportunidades de busca.

8. Seguir nichos.

A ordem é uma proposta e pode mudar conforme os dados de uso. Não há estimativa de prazo nem preço definido.

# Relatório de resultado do destaque

**Objetivo:** ajudar o divulgador a avaliar o desempenho da promoção e decidir sobre novas compras.

**Escopo inicial:** selecionar um período; exibir impressões, cliques, CTR e cliques por dia; separar home, busca e nicho; identificar os períodos com destaque ativo; mostrar custo por clique do período pago e comparar períodos equivalentes antes e durante o destaque.

**Base existente:** eventos de impressões e cliques, superfícies de promoção e histórico de pedidos.

**Critérios de conclusão:** acesso restrito ao proprietário; distinção entre ausência de dados e zero; tratamento de períodos sem cliques; comparação com duração equivalente; valores calculados a partir do mesmo período e link. CTR agregado deve usar cliques totais divididos pelas impressões totais. Definir a atribuição quando houver campanhas sobrepostas.

**Limite de interpretação:** clique não comprova entrada em grupo ou venda. A comparação antes e depois descreve desempenho e não comprova causalidade.

**Indicadores:** uso do relatório e proporção de clientes que voltam a comprar.

# Lembrete de renovação

**Objetivo:** facilitar a continuidade de um destaque que esteja prestes a terminar.

**Escopo inicial:** aviso no painel e por e-mail antes do vencimento, com data de encerramento, resumo de resultado e botão para o fluxo de renovação. Proposta de antecedência: três dias, sujeita a validação.

**Base existente:** expiração de promoções, fluxo de renovação, filas e envio de e-mails.

**Critérios de conclusão:** não duplicar avisos; não avisar sobre promoção cancelada ou já renovada; conferir o estado no momento do envio; permitir configurar os lembretes opcionais; renovar somente mediante ação do usuário.

**Indicadores:** renovações após o aviso e frequência de desativação dos lembretes.

# Links relacionados

**Objetivo:** oferecer continuidade à descoberta após o visitante abrir um link.

**Escopo inicial:** seção na página de detalhes com links publicados relacionados por nicho e rede; avaliar similaridade semântica como evolução. Não incluir o próprio link nem duplicados.

**Base existente:** catálogo com nichos e redes, busca semântica e embeddings.

**Critérios de conclusão:** respeitar moderação, disponibilidade, restrições de conteúdo e isolamento entre tenants; identificar eventual conteúdo patrocinado; ocultar a seção quando não houver sugestões úteis; medir impressões e cliques desta nova superfície separadamente.

**Indicadores:** cliques nas sugestões e quantidade de links explorados por visita.

# Favoritos e coleções

**Objetivo:** permitir que o visitante guarde descobertas e tenha motivo para voltar.

**Escopo inicial:** salvar e remover favoritos; criar, renomear e excluir coleções privadas; organizar os links em listas definidas pelo usuário, como Grupos de estudo e Comunidades de trabalho.

**Critérios de conclusão:** favoritos persistentes entre sessões; acesso restrito ao dono; salvar sem duplicação; indicação clara de links indisponíveis; excluir uma coleção sem excluir os links do catálogo. Definir se um favorito pode pertencer a várias coleções.

**Indicadores:** usuários que salvam links e retorno dos usuários com favoritos.

# Seguir nichos

**Objetivo:** entregar novas descobertas alinhadas aos interesses do visitante.

**Escopo inicial:** seguir e deixar de seguir nichos; resumo por e-mail com novos links publicados; frequência configurável e opção de desativar. Começar com um resumo semanal como hipótese de produto.

**Dependências:** preferências de usuário, histórico de envio, filas e tratamento das restrições de conteúdo.

**Critérios de conclusão:** adesão explícita aos resumos; cancelamento simples; não repetir o mesmo link indevidamente; verificar publicação e disponibilidade antes do envio; respeitar tenant e preferências de conteúdo.

**Indicadores:** cliques nos resumos, visitas recorrentes e cancelamentos.

# Denunciar um link

**Objetivo:** trazer problemas percebidos pelos visitantes para a operação de moderação.

**Escopo inicial:** botão de denúncia com motivos como convite expirado, spam e conteúdo incompatível; comentário opcional; fila administrativa com estados recebido, em análise e resolvido.

**Base existente:** moderação, autorização administrativa e registros de auditoria.

**Critérios de conclusão:** limitar abuso e denúncias repetidas; não retirar um link apenas pelo volume de denúncias; registrar a decisão administrativa; tratar denúncias de disponibilidade de forma distinta de denúncias de conteúdo; preservar o histórico.

**Indicadores:** tempo de resolução e proporção de denúncias confirmadas.

# Acompanhamento de disponibilidade

**Objetivo:** reduzir links expirados no catálogo e facilitar sua recuperação pelo proprietário.

**Escopo inicial:** verificações periódicas com intervalo configurável; repetir falhas antes de marcar indisponível; registrar última verificação; avisar o proprietário; permitir atualizar o convite e revalidar o destino.

**Base existente:** lógica de classificação de disponibilidade e acesso HTTP protegido.

**Critérios de conclusão:** timeouts e falhas transitórias não devem causar remoção imediata; bloqueios do provedor não equivalem automaticamente a link expirado; controlar frequência por host; usar acesso protegido contra destinos internos; aplicar validação e moderação ao endereço substituto. Definir o tratamento de promoções pagas durante a indisponibilidade.

**Limite de interpretação:** uma resposta HTTP acessível não garante que o convite permita entrada no grupo.

**Indicadores:** proporção de links indisponíveis e tempo até correção.

# Painel de oportunidades de busca

**Objetivo:** identificar demanda sem oferta suficiente e consultas com pouca interação.

**Escopo inicial:** registrar consulta, filtros, quantidade de resultados e interação de forma adequada à privacidade; agrupar termos equivalentes; mostrar consultas sem resultados e consultas frequentes com poucos cliques; filtrar por período, rede e nicho.

**Dependências:** instrumentação específica de buscas e vinculação da interação à consulta. Os eventos atuais de impressões e cliques por link não bastam para atribuir tudo a uma pesquisa.

**Critérios de conclusão:** acesso administrativo; limiar mínimo de ocorrências para evitar conclusões com pouca amostra; exclusão de tráfego de teste e abuso; prazo de retenção definido; evitar expor termos com dados pessoais; distinguir ausência de oferta de falha de busca.

**Indicadores:** taxa de buscas sem resultado e taxa de buscas que geram clique.

# Perfil público com categorias próprias

**Objetivo:** permitir que cada divulgador reúna sua presença em uma página compartilhável, no estilo Linktree.

**Escopo inicial:** aba Perfil no painel; foto, nome, descrição, redes sociais e botão principal; grupos e categorias definidos pelo usuário; ordenação e visibilidade de categorias e links; endereço como `seudominio.com/p/nome`.

**Regras:** as categorias pessoais são independentes dos nichos do catálogo. O usuário escolhe quais links ficam apenas no perfil e quais serão submetidos ao catálogo; publicar no perfil não deve aprovar automaticamente a entrada no catálogo.

**Critérios de conclusão:** nome de perfil único no âmbito definido para a plataforma; edição restrita ao proprietário; experiência adequada no celular; prévia da página; links ocultos não aparecem publicamente; regras de conteúdo e validação de destinos também aplicáveis ao perfil.

**Indicadores:** perfis publicados, compartilhamentos, visitas, cliques nos botões e usuários que voltam a editar.

# Página premium com subdomínio

**Objetivo:** oferecer uma página com identidade própria para divulgadores que precisam de uma apresentação mais completa.

**Escopo inicial:** endereço como `nome.seudominio.com`; capa, cores, temas e blocos de apresentação, serviços e contato. Domínio próprio pode ser uma evolução posterior.

**Modelo comercial proposto:** assinatura pelo conjunto de personalização, métricas e recursos de divulgação. O subdomínio integra o pacote; preços, limites e periodicidade de cobrança ainda precisam ser definidos.

**Critérios de conclusão:** reservar nomes de subdomínio usados pela plataforma; assegurar que cada endereço exiba apenas a página de seu proprietário; HTTPS ativo; publicação e prévia; funcionamento no celular; definição do comportamento em caso de atraso, cancelamento e mudança de nome.

**Cancelamento proposto:** manter o perfil básico acessível para preservar os endereços compartilhados, com política explícita para o subdomínio e os recursos premium.

**Indicadores:** conversão para plano pago, uso da personalização, renovação e cancelamentos.

# Planos para perfis e páginas

Proposta de diferenciação, sujeita a validação com o público. Não há preços nem limites numéricos definidos.

| Plano | Recursos propostos |
| --- | --- |
| Gratuito | Perfil em `seudominio.com/p/nome`, categorias próprias e tema básico. |
| Pro | Mais personalização, estatísticas por botão, agendamento de links e remoção da marca da plataforma. |
| Premium | Subdomínio, landing page com mais blocos e, futuramente, domínio próprio. |

A assinatura do perfil personaliza a página; a compra de destaque oferece exposição no catálogo. Manter os produtos separados inicialmente e avaliar combos depois.

**Decisões pendentes:** limites por plano, preço, cobrança, política de cancelamento, disponibilidade dos endereços e regras para mudanças de plano.

# Link permanente para convites

**Objetivo:** preservar um endereço compartilhado mesmo quando o convite de destino expirar.

**Escopo inicial:** endereço fixo da plataforma que redireciona para um convite atualizável pelo proprietário.

**Critérios de conclusão:** validar cada destino novo; aplicar as regras de conteúdo; registrar alterações; apresentar um estado claro quando o destino estiver indisponível; separar as métricas por período e destino quando necessário.

**Indicadores:** uso dos links permanentes e convites corrigidos sem trocar o endereço compartilhado.

# QR Code permanente

**Objetivo:** permitir compartilhar perfis e convites em materiais impressos sem trocar o QR a cada atualização do destino.

**Escopo inicial:** gerar e baixar QR para o perfil ou para um link permanente da plataforma.

**Critérios de conclusão:** o QR aponta para um endereço estável; atualização de destino não altera esse endereço; arquivo legível e testado por leitura; explicar que a permanência depende de manter o endereço da plataforma disponível.

**Indicadores:** uso dos QR Codes e acessos atribuídos a eles quando houver identificação específica.

# Agendamento de links

**Objetivo:** controlar a exibição de botões em eventos, inscrições e campanhas.

**Escopo inicial:** definir início e fim de exibição, com fuso horário explícito, opção de suspensão manual e indicação do estado no painel.

**Critérios de conclusão:** botões só aparecem no intervalo definido; validar datas; prévia dos estados; distinguir ocultar o botão de desativar o redirecionamento permanente.

**Indicadores:** links agendados e uso recorrente do recurso.

# Página por campanha

**Objetivo:** oferecer páginas específicas para ações de divulgação sem alterar o perfil principal.

**Escopo inicial:** criar uma versão do perfil para uma campanha, escolher seus links e obter endereço próprio com métricas separadas.

**Critérios de conclusão:** alterações da campanha não modificam o perfil principal sem ação explícita; identificar a campanha nas métricas; definir se os destinos são compartilhados ou copiados; permitir arquivar páginas.

**Indicadores:** campanhas criadas e cliques por campanha.

# Templates por atividade

**Objetivo:** acelerar a criação de páginas adequadas a diferentes públicos.

**Escopo inicial:** modelos para administradores de grupos, criadores, lojas, profissionais e eventos, com blocos e textos de exemplo editáveis.

**Critérios de conclusão:** prévia antes de aplicar; adaptação ao celular; conteúdo de exemplo não publicado por engano; confirmação antes de substituir uma página já configurada.

**Indicadores:** templates usados e proporção de páginas iniciadas que são publicadas.

# Importação em lote

**Objetivo:** reduzir o trabalho de cadastrar muitos links.

**Escopo inicial:** colar vários endereços, revisar títulos, identificar duplicados e organizar os itens em categorias antes da publicação.

**Critérios de conclusão:** mostrar erros por item; validar URLs; manter os itens válidos editáveis; não publicar sem revisão; separar importação para perfil de submissão ao catálogo.

**Indicadores:** conclusão das importações e quantidade de links cadastrados por lote.

# Busca dentro do perfil

**Objetivo:** facilitar a navegação em páginas com muitos links.

**Escopo inicial:** busca por nome e categoria, com filtros simples e mensagem para consultas sem resultados.

**Critérios de conclusão:** pesquisar somente itens públicos do perfil; respeitar agendamento e visibilidade; acesso pelo teclado; resultados atualizados após edição.

**Indicadores:** buscas que geram clique e uso em perfis com muitos itens.

# Prévia e histórico de versões

**Objetivo:** permitir revisar mudanças antes de publicar e recuperar configurações anteriores.

**Escopo inicial:** rascunho separado da versão pública, prévia para celular e computador e restauração de versões publicadas.

**Critérios de conclusão:** salvar rascunho não altera a página pública; restaurar exige ação explícita; definir limites de retenção; revalidar destinos restaurados. Histórico de apresentação não deve restaurar permissões, cobranças ou titularidade.

**Indicadores:** uso da prévia e restaurações concluídas.

# Equipe e permissões

**Objetivo:** permitir que colaboradores mantenham páginas e links.

**Escopo inicial:** convite de colaboradores, permissão de edição e revogação de acesso; cobrança e configurações da conta restritas ao proprietário.

**Critérios de conclusão:** autorização aplicada a cada ação; convites com prazo definido; registro de alterações; revogação efetiva; colaboradores acessam somente os perfis autorizados.

**Indicadores:** perfis com colaboradores e frequência de colaboração.

# Mídia kit do divulgador

**Objetivo:** ajudar o divulgador a apresentar sua presença e resultados para negociar divulgação.

**Escopo inicial:** página com apresentação, informações de contato e métricas da plataforma selecionadas pelo proprietário.

**Critérios de conclusão:** diferenciar dados medidos de dados informados pelo usuário; mostrar período e atualização das métricas; não apresentar cliques como membros ou vendas; permitir controlar o que fica público.

**Indicadores:** mídia kits publicados e acessos recebidos.

# Sequência proposta para os perfis

1. Perfil público com categorias próprias.

2. Personalização Pro e estatísticas por botão.

3. Links permanentes e QR Code.

4. Subdomínio com landing page premium.

5. Recursos adicionais conforme uso e demanda.

Validar se as pessoas publicam, compartilham e voltam a editar seus perfis antes de ampliar o editor. Esta sequência complementa as melhorias do catálogo; a prioridade entre as duas frentes ainda deve ser definida.

# Formulário de contato na página

**Objetivo:** transformar visitas ao perfil em pedidos de orçamento, listas de espera ou contatos interessados.

**Escopo inicial:** bloco de formulário com campos configuráveis, respostas no painel e exportação; escolha explícita para receber novidades quando aplicável.

**Critérios de conclusão:** acesso às respostas restrito ao proprietário e colaboradores autorizados; limitar spam; indicar sucesso e falha no envio; definir retenção e exclusão; não tornar os contatos públicos.

**Indicadores:** formulários enviados e taxa de envio em relação às visualizações do formulário.

# Distribuidor de convites

**Objetivo:** concentrar a divulgação de vários grupos em um único botão ou endereço.

**Escopo inicial:** cadastrar destinos, alternar os encaminhamentos ou usar pesos definidos pelo proprietário; pausar destinos manualmente.

**Critérios de conclusão:** validar todos os destinos; respeitar destinos pausados; registrar cliques por destino; impedir encaminhamento quando não houver destino válido; atualizar a distribuição sem trocar o endereço público.

**Limite inicial:** a detecção automática de grupo cheio depende das informações disponíveis em cada rede e não faz parte do primeiro lançamento. Um clique não confirma entrada no grupo.

**Indicadores:** uso do distribuidor e distribuição de cliques entre destinos.

# Descoberta de perfis

**Objetivo:** usar o catálogo para apresentar divulgadores, marcas e criadores, além de links individuais.

**Escopo inicial:** área pública de perfis por nicho, busca e opção de seguir um perfil; participação voluntária na descoberta.

**Critérios de conclusão:** listar somente perfis públicos e elegíveis; respeitar restrições de conteúdo e isolamento entre tenants; deixar claro quando houver exposição patrocinada; permitir deixar de seguir.

**Indicadores:** visitas vindas da descoberta, perfis seguidos e retorno de visitantes.

# Assistente de criação de perfil

**Objetivo:** facilitar a publicação do primeiro perfil.

**Escopo inicial:** a partir da atividade e dos links informados, sugerir bio, categorias, ordem dos botões e template; revisão pelo usuário antes de publicar.

**Critérios de conclusão:** não inventar credenciais, números ou benefícios; permitir editar e descartar sugestões; não publicar automaticamente; validar destinos; aplicar limites de uso e acompanhar custo das sugestões.

**Indicadores:** conclusão da criação, sugestões aproveitadas e tempo até a primeira publicação.

# Teste de versões de botões

**Objetivo:** comparar títulos ou apresentações de botões com base na interação dos visitantes.

**Escopo inicial:** duas variantes, distribuição estável por visitante e relatório de impressões e cliques por versão.

**Critérios de conclusão:** usar o mesmo objetivo e período de comparação; não trocar a variante a cada carregamento da mesma visita; definir amostra e regra de encerramento; indicar resultado inconclusivo quando houver pouca evidência; não escolher vencedor apenas pelo maior total bruto de cliques.

**Indicadores:** testes concluídos com amostra suficiente e mudanças adotadas pelos divulgadores.

# Filtros por cidade idioma e modalidade

**Objetivo:** tornar a descoberta mais específica para comunidades e atividades em que localização, idioma ou formato importem.

**Escopo inicial:** campos opcionais de cidade, idioma e modalidade presencial ou online, com filtros no catálogo.

**Critérios de conclusão:** permitir perfis sem esses dados; padronizar valores; não inferir localização pessoal automaticamente; combinar filtros sem excluir silenciosamente itens relevantes; apresentar consultas sem resultados de forma clara.

**Indicadores:** uso dos filtros e proporção de consultas filtradas que geram clique.

# Comprovação de propriedade

**Objetivo:** comprovar que um usuário controla um determinado destino divulgado.

**Escopo inicial:** procedimentos de verificação compatíveis com cada tipo de destino; selo com o objeto e o alcance da verificação.

**Critérios de conclusão:** não confundir confirmação de e-mail com propriedade de uma comunidade; definir validade e revalidação; revogar a comprovação quando o destino ou titular mudar; registrar evidências e impedir reutilização de desafios.

**Limite de interpretação:** comprovar controle não garante qualidade, segurança ou identidade civil do responsável.

**Indicadores:** verificações concluídas e proporção de destinos verificados.

# Página de evento

**Objetivo:** apoiar encontros, lançamentos e ações de comunidades.

**Escopo inicial:** bloco com data, fuso horário, local ou endereço online, descrição, inscrição e opção de adicionar ao calendário.

**Critérios de conclusão:** validar datas; informar cancelamento e mudança de horário; distinguir evento encerrado de link indisponível; não apresentar clique em inscrição como inscrição confirmada.

**Indicadores:** eventos publicados e cliques nos botões de inscrição e calendário.

# Integrações e avisos automáticos

**Objetivo:** conectar acontecimentos da plataforma à operação dos usuários profissionais.

**Escopo inicial:** avisos para sistemas externos quando houver contato recebido, aprovação de link ou encerramento de campanha; histórico de entregas no painel.

**Critérios de conclusão:** autenticar entregas; identificar eventos de forma única; repetir falhas com limites; aceitar que entregas podem se repetir e documentar deduplicação; restringir os dados ao necessário; validar destinos e proteger contra acesso à rede interna; permitir desativar a integração.

**Indicadores:** integrações ativas, taxa de entrega e falhas pendentes.

# Mapa de interação da página

**Objetivo:** identificar blocos pouco vistos e elementos com maior interação nas páginas personalizadas.

**Escopo inicial:** começar com estatísticas por bloco e profundidade de rolagem; avaliar mapas visuais depois, quando houver volume de dados suficiente.

**Critérios de conclusão:** separar versões da página e tamanhos de tela; evitar coleta de conteúdo digitado e dados pessoais; definir retenção e preferências de medição; mostrar ausência de dados sem tratar como zero; não interpretar rolagem como leitura comprovada.

**Indicadores:** uso do relatório e alterações de página feitas a partir dele.

# Prioridade sugerida para a expansão dos perfis

1. Assistente de criação para facilitar a primeira publicação.
2. Distribuidor de convites para quem administra vários grupos.
3. Formulário de contato como benefício potencial do plano Pro.
4. Descoberta de perfis quando houver quantidade suficiente de páginas úteis.

Esta proposta complementa as sequências anteriores. Preços, limites e prioridade final permanecem em aberto; registrar uma feature não autoriza sua implementação.

# Kit de divulgação

**Objetivo:** ajudar o usuário a divulgar o perfil depois da publicação.

**Escopo inicial:** gerar imagens para posts e stories com nome, descrição, endereço e QR Code do perfil, usando modelos editáveis.

**Critérios de conclusão:** prévia antes de baixar; textos legíveis nos formatos oferecidos; QR Code com leitura verificada; respeitar identidade visual e visibilidade dos dados; não gerar material público a partir de rascunhos sem ação explícita.

**Indicadores:** kits gerados, downloads e visitas atribuídas aos materiais quando houver identificação de origem.

# Coleções públicas compartilháveis

**Objetivo:** permitir que visitantes e divulgadores façam curadoria de links de diferentes proprietários.

**Escopo inicial:** publicar uma coleção com título, descrição, ordem dos links e endereço compartilhável, como Comunidades de programação. Evolução das coleções privadas já propostas.

**Critérios de conclusão:** publicação voluntária; diferenciar curador e proprietário de cada link; respeitar moderação, restrições de conteúdo e disponibilidade; não expor itens privados; retirar da exibição os links que perderem elegibilidade; permitir voltar a coleção para privada.

**Indicadores:** coleções publicadas, visitas recebidas e cliques nos links selecionados.

# Checklist de publicação

**Objetivo:** orientar a criação de uma página pronta para compartilhar.

**Escopo inicial:** passos para completar apresentação, revisar destinos, conferir a prévia no celular e compartilhar o perfil; indicação do progresso e ações diretas para cada etapa.

**Critérios de conclusão:** distinguir etapas obrigatórias de sugestões; atualizar o progresso após edições; permitir retomar o processo; não exigir campos opcionais para publicar; não apresentar uma prévia como teste real em todos os dispositivos.

**Indicadores:** conclusão do checklist, primeira publicação e primeira ação de compartilhamento.

# Central de contatos recebidos

**Objetivo:** acompanhar o atendimento dos contatos capturados nos formulários.

**Escopo inicial:** estados Novo, Em atendimento e Concluído; filtros, notas privadas e histórico de alterações. Depende do formulário de contato já proposto.

**Critérios de conclusão:** acesso restrito a responsáveis autorizados; notas nunca públicas; definir retenção, exclusão e exportação; preservar a origem e a data do contato; alteração de estado não envia mensagens automaticamente.

**Indicadores:** contatos tratados, tempo até o primeiro atendimento registrado e contatos pendentes.

# Pacotes para agências

**Objetivo:** atender profissionais que gerenciam páginas de vários clientes.

**Escopo inicial:** conta com vários perfis de clientes, identidade visual e relatórios separados; atribuição de colaboradores por cliente. Evolução do recurso de equipe e permissões.

**Critérios de conclusão:** isolamento de dados e permissões entre clientes; identificação clara da página em edição; definição de limites e cobrança; procedimento de transferência de titularidade; relatórios sem mistura de resultados.

**Indicadores:** contas com vários clientes, páginas gerenciadas por conta e renovação dos pacotes.

# Botão com alternativas de acesso

**Objetivo:** permitir que o visitante escolha o canal pelo qual deseja acessar uma comunidade.

**Escopo inicial:** um bloco reúne alternativas como WhatsApp, Telegram e site, com destinos e rótulos definidos pelo proprietário. Diferente do distribuidor de convites, a escolha é feita pelo visitante.

**Critérios de conclusão:** identificar cada canal com clareza; validar destinos individualmente; respeitar pausa e disponibilidade; oferecer navegação pelo teclado e no celular; medir cada alternativa separadamente; não prometer equivalência entre comunidades sem confirmação do responsável.

**Indicadores:** cliques por canal e uso dos blocos com alternativas.

# Exportação do perfil

**Objetivo:** dar ao proprietário uma cópia reutilizável de seus links, categorias e configurações.

**Escopo inicial:** baixar uma exportação estruturada com os dados do perfil e identificação da versão do formato.

**Critérios de conclusão:** exportação restrita ao proprietário ou papel autorizado; incluir a organização dos links; excluir senhas, tokens e segredos de integração; indicar quais arquivos ou recursos externos não estão incluídos; distinguir exportação de restauração automática, que exige fluxo próprio.

**Indicadores:** exportações concluídas e falhas de geração.

# Página em vários idiomas

**Objetivo:** atender públicos de idiomas diferentes com versões da mesma página.

**Escopo inicial:** o proprietário cria traduções da apresentação, categorias e botões; seletor de idioma visível; idioma principal como alternativa quando não houver tradução.

**Critérios de conclusão:** manter versões editáveis e consistentes; permitir selecionar o idioma manualmente; indicar traduções ausentes no painel; respeitar visibilidade e agendamento em todas as versões; definir endereços e metadados de idioma para páginas públicas.

**Indicadores:** páginas com traduções, visitas e cliques por idioma.

# Diagnóstico da página

**Objetivo:** oferecer sugestões práticas de melhoria a partir da configuração e do uso do perfil.

**Escopo inicial:** apontar títulos repetidos, destinos com problemas, excesso de itens e botões com pouca interação; sugerir ações sem aplicá-las automaticamente.

**Critérios de conclusão:** explicar a razão de cada sugestão; considerar período, impressões e posição do botão; diferenciar falta de dados de baixo desempenho; permitir ignorar sugestões; não prometer crescimento nem atribuir causalidade a correlações.

**Indicadores:** sugestões consultadas, ações adotadas e evolução posterior das métricas, sem atribuição automática de causa.

# App instalável

**Objetivo:** facilitar o retorno de quem administra páginas e links frequentemente.

**Escopo inicial:** tornar o sistema instalável como PWA, com ícone, nome e abertura do painel em janela própria quando o dispositivo e o navegador permitirem; orientação para instalação.

**Critérios de conclusão:** verificar instalação e atualização nos ambientes escolhidos; manter o uso normal pelo navegador; informar quando não houver conexão; não indicar que uma edição foi salva sem confirmação; evitar armazenamento de respostas privadas em caches compartilhados.

**Limite inicial:** instalação e experiência variam por navegador e dispositivo. Edição offline e notificações push exigem decisões e escopo próprios.

**Indicadores:** instalações quando mensuráveis, retorno ao painel e frequência de uso.

# Prioridade sugerida para publicação e divulgação

1. Kit de divulgação para facilitar o compartilhamento da página publicada.
2. Checklist de publicação para ajudar a concluir a configuração.
3. Coleções públicas para criar novas formas de descoberta.
4. Central de contatos depois de validar o uso dos formulários.

As demais propostas devem ser priorizadas conforme o público atendido e a demanda observada. Esta lista amplia o conjunto de possibilidades e não estabelece um compromisso de implementação.

# Moderação e alertas operacionais no grupo pela Evolution API

**Prioridade:** primeira feature de implementação, ID F42, antes de F01, depois somente do gate mínimo G00.

**Objetivo:** receber no grupo operacional os links que precisam de revisão humana e permitir ao administrador aprovar ou recusar com rastreabilidade, preservando o painel existente.

**Escopo inicial:** avisos de revisão inicial, contestação e edição de texto pendente; aprovação e recusa com motivo; confirmação da decisão; alerta de estorno não concluído e falha persistente da integração; tela administrativa de entregas e estado. Alertas de denúncias, disponibilidade e renovações serão conectados quando F06, F07 e F02 existirem.

**Destino informado:** grupo `120363430923498399@g.us`. Manager: https://evolution.temlinkaqui.com/manager. A origem de API candidata é `https://evolution.temlinkaqui.com`; versão, base efetiva e nome da instância devem ser confirmados antes de implementar. As duas sequências recebidas como possíveis credenciais não são reproduzidas nem classificadas sem confirmação.

**Reutilização:** ampliar os fluxos de moderação existentes e o worker BullMQ; compartilhar a decisão entre painel e grupo. Não criar bot com regras de moderação paralelas nem depender de F30.

**Critérios de conclusão:**

- **F42-AC01:** Entrada em revisão humana cria aviso durável correlacionado ao tenant, recurso, tipo e versão; retentativa da mesma ocorrência não cria nova intenção.
- **F42-AC02:** Aviso informa referência, nome, resumo limitado, rede, nicho, tipo de revisão e acesso ao painel; omite dados pessoais, credenciais e sinais sensíveis não necessários.
- **F42-AC03:** Administrador autorizado consegue aprovar a revisão atual por comando explícito e recebe confirmação somente após commit da decisão.
- **F42-AC04:** Recusa exige motivo não vazio e válido; confirmação mostra resultado real sem alterar a versão publicada de uma edição recusada.
- **F42-AC05:** Remetente normalizado é vinculado a User ADMIN ativo do tenant e à lista de operadores autorizados em cada ação; participar do grupo não concede poder.
- **F42-AC06:** Webhook só aceita eventos com autenticação verificável pelo mecanismo suportado pela instalação ou por gateway autenticado; ausência ou falha não executa ação.
- **F42-AC07:** Instância, grupo, tenant e recurso devem corresponder à configuração confiável do servidor; payload não escolhe tenant nem destinatário de saída.
- **F42-AC08:** Parser só aceita comandos exatos do corpo da mensagem admitida; citações, encaminhamentos, conteúdo do link e mensagens editadas/históricas não viram autorização implícita.
- **F42-AC09:** Referência de ação é opaca, expira, vincula revisão/snapshot e é consumida atomicamente; referência antiga ou já usada não altera o recurso.
- **F42-AC10:** Decisão simultânea por painel e grupo permite um único vencedor; ação perdedora informa resolvido ou desatualizado sem efeitos duplicados.
- **F42-AC11:** Aprovação e recusa pelo grupo conservam regras de domínio, nichos restritos, slots, auditoria, publicação, embedding e notificações aplicáveis do fluxo atual.
- **F42-AC12:** Revisão inicial, contestação e proposta de texto têm tipo explícito e dispatch para o caso de uso adequado; edição pendente não é aplicada como link novo.
- **F42-AC13:** Evento de saída é persistido em transação com a mudança de domínio e processado pelo worker BullMQ existente, com recuperação após reinício.
- **F42-AC14:** Falha ou desconexão da Evolution não perde revisão, bloqueia submissão nem aprova ou recusa automaticamente; painel permanece operacional.
- **F42-AC15:** Entrega registra tentativas e ID retornado pelo provedor; timeout ambíguo vira estado de entrega incerta com política de reconciliação, sem prometer exatamente uma vez.
- **F42-AC16:** Eventos próprios, recibos, histórico inicial e notificações de envio não realimentam comandos nem geram tempestade de mensagens.
- **F42-AC17:** Registro de eventos distingue revisão pendente, contestação, decisão e falhas operacionais; alertas ainda sem produtor ficam desabilitados até sua feature existir.
- **F42-AC18:** Configuração e segredos ficam no servidor, com chaves tipadas e valores mascarados; logs, testes, exportações e frontend não recebem credenciais reais.
- **F42-AC19:** Admin pode ver estado da integração, fila de entrega e falhas, desativar envio/ações e solicitar reprocessamento controlado; usuário comum é negado.
- **F42-AC20:** Integração começa desabilitada; habilitar exige configuração válida e prova em sandbox; não envia a grupo ou instância arbitrários.
- **F42-AC21:** AuditLog liga operador, canal, recurso, decisão, motivo e correlação; não armazena conversa inteira nem segredo e tem retenção definida.
- **F42-AC22:** GET e abertura de link nunca decidem; alternativa pelo painel exige sessão ADMIN, CSRF e confirmação explícita.
- **F42-AC23:** Botões interativos só são habilitados após ensaio na versão e tipo de conexão instalados; comandos de texto e acesso ao painel permanecem alternativas funcionais.
- **F42-AC24:** Testes cobrem unitários, controller, PostgreSQL, Redis e Playwright com Evolution simulada; ensaio real de grupo é gate separado e não usa credenciais reais no CI.
- **F42-AC25:** Falha de estorno e esgotamento de entrega geram alertas resumidos e deduplicados; falha do próprio canal também aparece no painel, sem recursão pelo canal quebrado.
- **F42-AC26:** Expiração, retenção, revogação de operador e rotação de segredo invalidam ações pertinentes; mensagens já entregues não são consideradas apagadas por purge local.

**Indicadores:** tempo entre revisão humana e decisão, avisos pendentes, sucesso/falha de entrega, comandos autorizados recusados por conflito e decisões auditadas por canal.

**Decisões pendentes:** versão e tipo de conexão Evolution, identidade da instância, configuração segura de credenciais e autenticação do webhook, operadores vinculados a administradores, prazo de referência, retenção, retry e comportamento de entrega incerta. Botões são opcionais condicionados a prova de compatibilidade; comandos explícitos são alternativa obrigatória.

**Limite desta solicitação:** planejamento e documentação. Não executar integração, configurar webhook, chamar API autenticada, enviar mensagem ou instalar dependência nesta etapa.


