# Ondas — validação visual de painel, perfil e recursos pessoais

Data: 2026-10-24. Responsável: ondas_profile_finish.

## Propriedade e método

44 rotas da matriz de 95 e alias `/painel/visao → /painel`. Fora: conta/verificação/autenticação, publicação, checkout/assinatura e administração. Raiz coordena runtime/runner e consolidação global. Nenhuma matriz global ou grafo alterado nesta extensão.

Skills: Superpowers, Graphify confirmado na fonte, auditoria/validação TemLink, Taste app screens, Impeccable e Emil. O lote inicial do harness foi seguido de correções locais fundamentadas na fonte e nos PNGs, registradas abaixo.

O helper `e2e/ondas-visual-fixture.ts` foi extraído do coverage existente; preservadas suas quatro declarações de teste. Contas sintéticas próprias por caso, tenant checklist e stub existentes, sem reset global. Exports Fixture, isolatedFixture, login, saveProfile, publishProfile, redirect, visit, audit e roadmapApi.

## Inventário finito de estados reais

Sem produto cartesiano arbitrário. Estados abaixo existem na fonte/E2Es. Em cada rota, leitura pendente/erro é aplicável apenas quando há GET inicial; em listas, vazio/populado/filtro sem resultado. Exportar não tem carregamento inicial: pendência é da ação. Cada estado exige PNG D/M e abertura humana, separadamente da execução.

| ID | Rota | Estados específicos além da base/leitura | D/M captura e revisão |
| --- | --- | --- | --- |
| P01 | `/painel/clientes/acessos` | Solicitar sem/com página/colega; pendente; aprovar/recusar; encerrado | PENDENTES |
| P02 | `/painel/clientes` | Adicionar sem/com concessão; portfólio; remover; filtro sem resultado | PENDENTES |
| P03 | `/painel/clientes/transferencias` | Novo titular; conferir/consentir; enviada/recebida; aceitar/recusar/cancelar; concluída/expirada | PENDENTES |
| P04 | `/painel/convites/[id]/distribuicao` | Escolher; dividir; conferir; ativa; sem elegível/pausado; destino único | PENDENTES |
| P05 | `/painel/convites` | Criar/alterar; histórico; validado/revisão/recusado/indisponível; desativar; QR; busca/abas | PENDENTES |
| P06 | `/painel/denunciar/[id]` | Motivo/comentário; indisponível; envio pendente/erro conserva comentário/sucesso | PENDENTES |
| P07 | `/painel/equipe/[id]/editar` | EDITOR/VIEWER; seções/menu; concessão encerrada | PENDENTES |
| P08 | `/painel/equipe/[id]/metricas` | Consulta sem ação do titular; métricas/filtros; concessão encerrada | PENDENTES |
| P09 | `/painel/equipe/[id]/previa` | Prévia autorizada; busca/paginação; concessão encerrada | PENDENTES |
| P10 | `/painel/equipe` | Conta/página: vazias/populadas; convite e-mail/permissões/personalizado/revisão/link; editar/revogar; filtros | PENDENTES |
| P11 | `/painel/favoritos` | Favoritos/coleções; criar/renomear/excluir; adicionar; detalhe; publicar/retirar; busca | PENDENTES |
| P12 | `/painel/integracoes` | Conexões; nova/editar etapas; chave; renovar/remover; entregas por situação/filtros | PENDENTES |
| P13 | `/painel/interesses` | Nenhuma/seguidas; filtros; resumo e-mail/desativar | PENDENTES |
| P14 | `/painel/lembretes` | Sem/com aviso; preferências e confirmação | PENDENTES |
| P15 | `/painel` | Sem/com links; resumo/métricas; sidebar/menu/atalhos | PENDENTES |
| P16 | `/painel/perfil/aparencia` | Temas/Cores/Botões e texto; ColorPicker; Select aberto/selecionado; paleta preservada | PENDENTES |
| P17 | `/painel/perfil/assistente` | Atividade/links/fatos; indisponível/limite; revisão/seleção/prévia; recente/aplicada | PENDENTES |
| P18 | `/painel/perfil/busca` | Desligada/ligada; filtros/paginação/seleções | PENDENTES |
| P19 | `/painel/perfil/campanhas/[id]/metricas` | Sem/com visitas; filtros; indisponibilidade | PENDENTES |
| P20 | `/painel/perfil/campanhas/[id]/previa` | Rascunho/publicada; busca/filtros; inexistente | PENDENTES |
| P21 | `/painel/perfil/campanhas` | Nova/editar; rascunho/publicada/alterada/arquivada; excluir/arquivar; filtros | PENDENTES |
| P22 | `/painel/perfil/canais/[groupId]` | Novo/existente; escolher destino; mais opções; pausado/indisponível/inexistente | PENDENTES |
| P23 | `/painel/perfil/canais` | Grupos/filtros; remover | PENDENTES |
| P24 | `/painel/perfil/checklist` | Pendentes; obrigatórios/concluídos; ações existentes | PENDENTES |
| P25 | `/painel/perfil/contatos` | Configurar; estados de atendimento; busca/filtros; excluir/exportar | PENDENTES |
| P26 | `/painel/perfil/conteudo` | Sem benefício/habilitado; TEXT/IMAGE/VIDEO/evento; editor | PENDENTES |
| P27 | `/painel/perfil/dados` | Identidade; foto ausente/presente/erro; salvar pendente/erro/conflito | PENDENTES |
| P28 | `/painel/perfil/descoberta` | Catálogo; indexação opt-in/out; campos/seletores | PENDENTES |
| P29 | `/painel/perfil/diagnostico` | Análise; recomendação/comparação; descartar/aplicar; indisponível | PENDENTES |
| P30 | `/painel/perfil/divulgar` | Formato/texto/cores; gerar; pronta/desatualizada; download | PENDENTES |
| P31 | `/painel/perfil/endereco` | Sem benefício; escolher/reservar; verificar HTTPS; ativo/desativar | PENDENTES |
| P32 | `/painel/perfil/exportar` | Rascunho/publicado; arquivo inválido; importar prévia/confirmação/erro/resultado | PENDENTES |
| P33 | `/painel/perfil/formulario` | Desligado/ligado; campos/finalidade; prévia | PENDENTES |
| P34 | `/painel/perfil/historico` | Versões; comparar; restaurar/confirmação/erro | PENDENTES |
| P35 | `/painel/perfil/idiomas` | Sem/com tradução; identidade/grupos/botões; remover/recarregar | PENDENTES |
| P36 | `/painel/perfil/importar` | Origem/linhas; prévia/seleção; erro/resultado | PENDENTES |
| P37 | `/painel/perfil/links` | Grupos/links: adicionar/editar/remover; principal; ordenar/ocultar | PENDENTES |
| P38 | `/painel/perfil/metricas` | Sem benefício; pausada/ativa; sem/com visitas; filtros | PENDENTES |
| P39 | `/painel/perfil/midia-kit` | Rascunho; dados/contatos/métricas; publicada/retirar | PENDENTES |
| P40 | `/painel/perfil/midia-kit/previa` | Sem apresentação; rascunho/publicada; métricas informadas/medidas | PENDENTES |
| P41 | `/painel/perfil/modelos` | Galeria; cinco prévias e confirmações preservar/substituir | PENDENTES |
| P42 | `/painel/perfil` | Sem página/publicada/alterações; salvar pendente/erro/conflito; menu/recarregar/retirar/QR | PENDENTES |
| P43 | `/painel/perfil/previa` | Rascunho/publicada; busca/paginação; idade aplicável | PENDENTES |
| P44 | `/painel/perfil/testes` | Instruções; botão/textos/limites; configurada/ativa/resultado; interromper/recarregar | PENDENTES |

## Harness e estados instrumentados

`e2e/ondas-full-profile-visual.spec.ts`:35rotas parametrizadas +11jornadas iniciais +27avançadas =73casos por viewport pela expansão estática. A primeira execução da raiz coletou67por viewport antes das últimas adições; não confundir73escritos com73aprovados. Capturas em1440×900 e390×844, reduced-motion e helper captureOndasState da raiz (PNG/JSON/SHA/DOM/Axe/overflow). IDs/slugs isolados impedem baseline pixel a pixel determinístico; conteúdo e dimensões seguem as fixtures.

As27jornadas avançadas percorrem: salvamento pendente/erro/conflito/menus/confirmações; TEXT/IMAGE/VIDEO e remoção; diagnóstico e descarte; atendimento/notas/histórico com paginação; integração/entregas/chave; categorias/lembretes; decisões de acesso; transferência com e sem página própria; host ativo/HTTPS/histórico fechado e aberto; assistente/revisão/aplicação/indisponibilidade/limite; checklist/publicação/bloqueio; cores/tipos de link; coleção e confirmação inline; detalhe/histórico/desativação de link permanente; distribuição/pausa/destino único; convite granular/revisão/link; comparação/configuração/execução/resultados; arte/cores/geração; formulário/descoberta; foto válida/inválida; restauração/erro; grupo/link editar/remover/ocultar/principal; busca ligada/desligada; métricas/dados/filtro/amostra; canais pausados/revisão/ausente; painel com link real; mídia-kit/contatos/métricas/seguidores/retirada. Denúncia inicial também ganhou envio pendente/erro conservando texto/sucesso real.

GET retido/503 e DTOs de atendimento, integração, agência, hosts, lembretes, relatório de interação, resultado de comparação e estados de canal usam `presentation-fixture`. São estados da apresentação existentes na fonte, sem atestar autorização, disponibilidade comercial, moderação ou entrega externa. Geração de IA usa apenas stub local. Perfil, foto, campanhas, convites, distribuição, favoritos, coleções e concessão usam API real com contas sintéticas. VIEWER e revogação só alteram associação criada no próprio caso. grantRichBlocks prepara conta sintética e não chama provedor de cobrança.

O harness exige GET efetivamente interceptado antes de fotografar carga/erro. Alertas são aguardados dentro de main, com texto e skeleton zerado. Estados estáveis também aguardam pendência zerar; carregando/salvando/envio-pendente são as únicas exceções explícitas. Isso corrigiu capturas precoces do primeiro lote e alvos incorretos de GET em métricas/prévia colaborativas.

## Revisão humana do primeiro lote desktop

Todos os78boards001–078 de `output/ondas-v24/profile-initial-boards-early` foram abertos via view_image,233PNGs originais/310recortes. Cada SHA256 foi conferido e registrado em `2026-10-24-ondas-profile-review.json`; os estados marcados para recaptura continuam pendentes. O lote não inclui mobile e não contém PNG de /perfil/midia-kit/previa (teste interrompido antes por uma expectativa de h1 inadequada ao feedback de erro).

Achados corrigidos após essa inspeção:

- Axe: nomes Subir/Descer preservam o rótulo e identificam o bloco; cartão de link permanente usa nome natural na ordem visível. Duas regressões observadas falhando e depois verdes.
- Idiomas e histórico de endereços mantêm o Lens fora de details fechado. AST de todas as fontes de produto confirmou zero Lens filho direto de details após os ajustes; lentes dentro de summary e conteúdo aberto continuam válidas.
- Integrações: Mais opções e código da chave recebem o material local persistente. Skeleton da equipe também recebeu Lens nos dois cards de carga.
- Calendários nativos: scan global encontrou7campos em3arquivos. Os5de InteractionScreen/MediaKitEditor migraram ao DatePicker. Os2de SearchOpportunitiesPanel foram coordenados com resource. DatePicker ganhou min/max sem remover validade, limites inclusivos, required, horário local ou ISO; dias fora do intervalo são desabilitados e teclado fica na borda. Harness inclui popups abertos e datas inválidas nas duas larguras.
- Harness: favoriteId corrigido, menu Mais opções expandido antes de Renovar chave/Remover, aba Entregas dos avisos, exclusão inline de coleção, Remover idioma, guard de transferência com página própria preservado e preparação real do rascunho de mídia-kit. Login espera hidratação e fim dos skeletons antes de navegar.

## Checks executados e limites

-7testes em2arquivos para as regressões de nomes acessíveis, verdes após RED inicial.
-6testes em2arquivos de integrações/traduções, verdes.
-21testes em5arquivos de DatePicker/hosts/interação/mídia-kit, verdes;3casos novos de limites falharam antes da implementação.
-ESLint focal dos arquivos alterados aprovado; typecheck E2E aprovado. A raiz executa types globais/build/Playwright de forma serial.
-Nenhum E2E/build/servidor/navegador foi iniciado por este agente nesta extensão.Revisão inicial de 233 PNGs desktop, complementada pelos 99 boards e registros D/M descritos abaixo. Cores/checkbox/calendários e fontes corrigidas precisam de recaptura no novo build coordenado pela raiz.

## Registro humano

A lista por arquivo, rota, estado, viewport, boards eSHA256 está no JSON próprio. Nenhuma linha da matriz acima está concluída em D/M só pela existência do teste ou imagem; continua necessário executar as adições, recapturar as falhas/estados precoces e revisar os próximos PNGs mobile/avançados.


## Fechamento da revisão remaining001–099

Os boards001–099 de `output/ondas-v24/profile-initial-boards-remaining` foram abertos pessoalmente via view_image:396recortes,283registros completos (208mobile390px e75desktop1440px). O registro283, sem-página do assistente, atravessa os boards099/100 e fica marcado como parcial neste registro próprio. A raiz delegou100–140 ao agente ondas_resource_visual_finish, que entregou `output/ondas-v24/profile-remaining-resource-review.json`:41boards abertos,161recortes,121registros completos e a outra parte do283. Não declaro ter aberto esses41boards.

Somando o primeiro lote e esta revisão,516referências de captura foram examinadas integralmente por este agente, correspondendo a492SHA256 únicos. Os24arquivos com bytes repetidos mantêm suas outras ocorrências no ledger; hash repetido não é um novo estado aprovado. O registro atual tem194hashes com recaptura exigida e298sem nova falha material confirmada. Esses números descrevem esta revisão, sem atestar os estados ausentes ou os novos binários.

Achados e correções locais posteriores aos PNGs:

- Os editores TEXT/IMAGE/VIDEO herdavam `display:grid` do seletor descendente do cabeçalho da página; `.editor > header` limita a regra. O upload IMAGE agora usa FileUpload existente, preservando accept, validação, preparação da imagem, erro e pendência. Teste novo observou RED e passou após a alteração.
- Assistente: escolhas selecionadas, origem das sugestões, prévia e sugestão recente usam Lens; os details mantêm um host externo persistente para que o vidro continue visível fechado.
- Distribuição: chamadas de endereço, escolhas de modo, destinos selecionados, conferência e feedback de ausência de elegíveis usam o mesmo material refrativo. A seleção conserva borda e tinta semântica; o estilo do texto fica restrito ao conteúdo, sem atingir o span decorativo da lente.
- Transferência: os avisos das duas etapas e da decisão preservam copy/consentimento e a tinta de alerta com Lens. Nenhuma condição de aceite ou titularidade mudou.
- Editor: ChangedField, banner de alterações, falha de salvamento e confirmações de recarregamento/retirada mantêm a indicação de mudança/aviso com tintas translúcidas. Grupos ocultos, remoção e feedbacks de links permanentes seguem esse material, sem alterar regras ou ações.
- A raiz corrigiu o cabeçalho sticky de OverlayDialog após o achado123/124 do outro revisor. O agente público corrigiu ProfilePreviewShell/Skeleton de carga/erro/+18 sem impor uma paleta ao perfil publicado. Ambas as correções exigem recaptura.

O helper `captureDialogRemainder` aceita Locator opcional e origem da captura. O shot de popup seleciona somente o último diálogo visível e captura posições sobrepostas da rolagem interna, restaurando a posição original. Isso permite examinar os trechos inferiores do histórico, modelos e permissões, antes ocultos pela janela do diálogo. Não muda decisões ou valores. Capturas de modelos com área interna rolável não foram classificadas como falha funcional apenas pelo corte da viewport; os trechos inferiores precisam desta rodada ampliada.

## Classificação das19falhas do primeiro runner

Fonte de evidência: `output/ondas-v24/profile-initial.json`,115passaram/19falharam de134casos coletados (67porviewport). Cada correção abaixo ainda depende de reexecução e nova revisão visual; alteração de fonte não equivale a falha encerrada.

| Família | Falhas | Diagnóstico e ação |
| --- | --- | --- |
| Mídia-kit/prévia D/M |2| O feedback de ausência/erro não tem h1. Harness agora aguarda o feedback real nesta rota. |
| Convites D/M |2| Axe label-content-name-mismatch: nome aria fora da ordem visível. Rótulo natural preservado; regressão focal RED→GREEN. |
| Favoritos D/M |2| Fixture usava `id` em vez de `favoriteId` do contrato real. Corrigido. |
| Conteúdo D/M |2| Axe: nomes Subir/Descer omitiam o rótulo visível. Corrigidos; regressão focal RED→GREEN. |
| Integrações D/M |2| Ação Renovar chave fica em Mais opções fechado. Harness abre o menu e seleciona a aba de entregas correta. |
| Transferências D/M |2| Fixture tentava receber página em conta com página própria. Preparação preserva o guard e usa conta de destino adequada. |
| Coleções D/M |2| Exclusão é confirmação inline, não dialog. Harness aguarda o grupo de confirmação existente. |
| Link permanente D/M |2| Região esperada inexistente; detalhe usa heading e Tabs. Harness aguarda o título e abre Gerenciar endereço antes de desativar. |
| Contatos mobile |1| Abas responsivas viram Select. Harness usa a alternativa exposta e preserva a seleção por nome. |
| Recursos derivados D/M |2| `route.continue: Assertion error` em20,7/21s, sem timeout. GET foi restringido ao endpoint exato e a espera de erro foi refinada; não há confirmação de encerramento antes de nova execução. Nenhum prazo aumentado nem erro suprimido. |

## Verificações finais locais e recapturas

Além dos checks anteriores:7testes de FileUpload/conteúdo verdes após RED;4testes do assistente verdes;22testes de pools/agência/editor verdes;10testes de links permanentes/grupos verdes. ESLint focal aprovado para esses componentes e o harness. Typecheck E2E novamente executado e aprovado; resultado comunicado à raiz. Não executei E2E/build ou controles de servidor.

Recapturar em desktop e mobile: conteúdo e seus três diálogos; assistente/seleção/origem/prévia/recente; distribuição em todas as etapas e avisos; transferência com/sem consentimento e decisão; ChangedField/banner/falhas/confirmar recarga/retirada; grupos ocultos/remoção; link permanente/criação/avisos/status; histórico e modelos em todos os trechos internos; carga/erro da prévia; ColorPicker/idiomas/hosts/checkbox da equipe/calendários já alterados após o primeiro build. Todos os estados de erro antigos exigem novamente o alerta estável. As seis jornadas acrescentadas após a coleta inicial também precisam rodar.

Fonte de produto congelada neste fechamento. O ledger conserva as pendências: nenhuma linha D/M da tabela é declarada concluída apenas pela geração dos screenshots ou pelo runner inicial. Runtime, build, execução integrada e rodada final de pixels são coordenados pela raiz.


## Correção pontual de pedidos — achado de revisão pública

Após o congelamento anterior, a raiz delegou o achado de `admin-final-boards-early/board-002.png`: `/painel/pedidos` exibia erro e confirmação de vazio simultaneamente. A condição na OrdersArea foi reproduzida por regressão focal; a falha de rede também revelou uma rejeição sem tratamento que mantinha a carga indefinida.

Alteração limitada à OrdersArea em `components/domain/panel.tsx` e seu teste: ErrorState com retentativa na mesma consulta, sem EmptyState enquanto o carregamento falhou; pedidos e nomes já conhecidos são preservados durante falha/retentativa. Resposta200vazia continua mostrando o vazio verdadeiro. Filtros, endpoints e contratos comerciais permanecem. Respostas após desmontagem são ignoradas.

RED observado nos dois casos novos (erro junto de vazio; rejeição offline sem feedback). GREEN:3testes do arquivo, incluindo regressão existente do painel e recuperação com conservação dos pedidos antigos. A raiz coordena build/E2E e recaptura D/M; a nova imagem ainda está pendente.


## Diagnóstico de target-size em gestão mobile

A raiz delegou o achado do runner `admin-final` em `office-link-status-options`. PNG aberto pessoalmente:390×2231, SHA256 `5f812a95228a2612b5afbaf44290a51ed7e3580cc2127edbc4d05d36d372304e`. O trace identifica `_r_t_` como Select “Área de gestão”, cuja lente mede356×49px; não era um controle com altura intrínseca17,6px. O menu “Situação dos links” estava aberto acima do próprio trigger e cobria quase todo o outro Select, deixando uma faixa exposta de17,6px.

A sequência do harness era abrir o popup e depois chamar captura fullPage, cujo helper força scrollTo(0,0) antes da imagem e do Axe. Isso reposicionava o popup ancorado na situação parcialmente obscura. O ajuste fica apenas em `e2e/ondas-full-admin-visual.spec.ts`: centralizar o trigger antes de abrir e fotografar o popup na viewport, sem reset de scroll. A página fechada continua com suas capturas integrais; Axe segue completo, sem excluir esse alvo ou a regra target-size. Nenhum CSS ou comportamento do Select de produto foi alterado. Reexecução e recaptura pela raiz ainda necessárias para confirmar o resultado.

## Revisão de gestão — boards 064–126

Abri pessoalmente todos os 63 boards atribuídos de `output/ondas-v24/admin-final-boards-remainder` com view_image. São 252 recortes e 124 registros envolvidos. Destes, 122 PNGs têm todos os recortes revistos nesta fatia: 54 desktop e 68 mobile, com 97 hashes únicos. Incluindo as duas imagens parciais das bordas, há 98 hashes únicos. Os SHA256 foram conferidos contra os bytes dos PNGs originais. O ledger próprio está em `output/ondas-v24/admin-final-profile-review.json`; ele conserva cada ocorrência por arquivo/estado, mesmo quando os bytes se repetem.

O registro 180, relatório financeiro de horários em tabela, tem o topo no board 063 do revisor público e os dois recortes inferiores no 064 desta fatia. O registro 303, gráficos de tráfego, tem o topo no 126 desta fatia e os recortes inferiores no 127 do revisor de recursos. Os dois ficam explicitamente parciais neste ledger. Não declaro ter revisado as outras fatias nem os 30 boards iniciais.

Único novo defeito material confirmado nesta fatia: “Como interpretar”, em Buscas, perdia o vidro quando fechado. O host persistente agora fica fora do details, com a mesma lente e sem alterar conteúdo, semântica ou comportamento de abertura. CSS e caller de produção em `/admin/visao` foram conferidos. Os cinco testes existentes da funcionalidade e o lint focal passaram. O harness acrescenta `office-search-interpretation-open`; o estado fechado já constava das capturas. Ambos exigem nova imagem D/M após rebuild.

O menu de situação dos links mantém a pendência de recaptura descrita acima. Nenhum outro novo corte, contraste insuficiente ou vazamento de rolagem obrigatório foi confirmado nos pixels atribuídos. Isso não aprova colunas ocultas: as tabelas mobile usam rolagem horizontal local intencional e o primeiro lote mostrava somente scrollLeft=0. As colunas à direita não foram examinadas nesse lote.

Para fechar essa lacuna de evidência, acrescentei `captureHorizontalRemainder` em `e2e/ondas-admin-visual-tools.ts`. O helper percorre somente regiões visíveis de tabela com overflow horizontal, fotografa posições com 20% de sobreposição e identifica a região, índice, offset e larguras no registro. Cada posição usa fullPage, incluindo todas as linhas das colunas reveladas, sem deslocar o scrollLeft local ao reposicionar a página no topo. Restaura o scrollLeft e a posição da página em finally, inclusive quando a captura falha. A captura base conserva o Axe completo; as posições seguintes sinalizam à composição que não repita a análise nem percorra novamente as mesmas tabelas. A integração na captura compartilhada fica com a raiz, sem ciclo de imports de runtime.

RED observado nos dois testes novos do helper, seguido de GREEN 2/2. ESLint dos helpers/harness/teste e typecheck E2E aprovados. Não executei E2E, build, servidor ou navegador. Capturas novas e revisão pessoal dos PNGs continuam pendentes; gerar arquivos não encerra esta validação.

## Regressão isolada de hidratação concorrente

A raiz delegou a prova do cursor de hidratação descrita em [React PR35494](https://github.com/react/react/pull/35494/files). O runtime realmente embarcado pelo Next15.5.26 é React19.2.0-canary-0bdb9206-20250818, diferente do React19.0.0 de npm. A primeira comparação com a versão de npm também falhava no controle com Suspense, portanto ela não fundamentou a correção. A prova seguinte utiliza explicitamente os módulos compiled React/ReactDOM do Next instalado.

O experimento mínimo com o runtime correto reproduziu o cursor incorreto sem Suspense; com o boundary, reteve o main do servidor e não reportou erro recuperável. A regressão permanente `components/layout/layout-hydration.test.tsx` usa RootLayout assíncrono e SiteShell/LiquidLens reais, substituindo somente integrações de request, fontes, navegação, atmosfera e consentimento/visitas. O servidor recebe main estático. O cliente recebe Promise nativa inicialmente sem status fulfilled; ela resolve na microtask agendada pela navegação durante o primeiro render concorrente. A verificação exige commit da hidratação, zero onRecoverableError e identidade preservada do main e do host main-content originais.

RED observado antes da mudança de produto: SiteShell tentava reclamar div#main-content enquanto o cursor já apontava para main, embora o conteúdo esperado fosse idêntico. A raiz acrescentou Suspense ao redor de children passado ao SiteShell, sem novo elemento de layout. O mesmo teste passou depois: GREEN1/1, repetido após o comentário explicativo. ESLint de teste e RootLayout passou. A remoção do workaround fica condicionada ao Next incorporar a correção upstream, indicada no comentário. Isso comprova esta regressão determinística; a ausência de outros erros de hidratação nas rotas reais depende do rebuild e stress coordenados pela raiz. Nenhum build/E2E/browser foi executado por este agente.

## Revisão das referências decodificadas — remaining 001–043

Abri pessoalmente os 43 boards de `output/ondas-v24/public-reference-decoded-boards-remainder`: 169 recortes, cobrindo integralmente os 25 PNGs mobile atribuídos. O ledger próprio `output/ondas-v24/public-reference-decoded-profile-review.json` registra arquivo, rota, estado, boards e SHA256 conferido contra os bytes originais. Não há registro parcial de fronteira neste lote. Os 55 boards early pertencem ao revisor público; não reivindico esses pixels nem hashes excluídos.

As 25 opções experimentais preservam suas paletas, tipografia e composição intencionais. Não encontrei novo bloqueio obrigatório nos pixels visíveis. Há observação menor em Bauhaus/Jardim: o canto orgânico da foto intercepta parte do ícone decorativo de patrocinado, mantendo o texto legível; a raiz foi avisada e nenhum produto foi alterado nesta revisão. Galeria mobile mostrou as fotos de música e fotografia. O erro externo502 desktop e a recaptura bem-sucedida relatados pela raiz não pertencem a esta fatia.

Cartões-postais e Cinema exibem carrosséis horizontais de destaques; só o primeiro card e parte do segundo aparecem no offset inicial. Os pixels dos cards restantes seguem pendentes, sem tratar rolagem intencional como defeito. A raiz autorizou ampliar o helper QA existente para registrar esses offsets em capturas sobrepostas. Animação, teclado e comportamento real não são atestados apenas por imagens estáticas.

A extensão QA foi concluída: a descoberta inclui regiões de tabela e div/section/ul com article filho direto, mantendo os checks de overflow local e visibilidade. Tabelas e regiões altas continuam fullPage; trilhos de cards que cabem na viewport com100px de margem são centralizados e fotografados na viewport. O registro usa o scrollLeft efetivo depois de dois frames, incluindo eventual ajuste de scroll-snap. As posições originais continuam restauradas. O caso de carrossel compacto observou RED antes da mudança e GREEN depois; os três testes do helper passaram, junto de lint e typecheck E2E. A raiz fará somente as recapturas laterais pertinentes. Nenhum novo PNG é tratado como examinado por esta alteração de QA.


## Revisão de gestão verificada com CDP — boards 067–132

Abri pessoalmente os 66 boards atribuídos de `output/ondas-v24/admin-verified-cdp-boards-early`, incluindo todos os 264 recortes. O ledger próprio `output/ondas-v24/admin-verified-cdp-profile-review.json` registra cada arquivo, rota, estado, SHA256 conferido contra os bytes originais e os recortes realmente vistos. São 164 registros envolvidos: 162 PNGs completos nesta fatia (111 desktop e 51 mobile), com 149 hashes únicos completos. Incluindo as duas fronteiras parciais, são 151 hashes únicos.

O registro219, conflito de decisão em denúncias, tem somente o trecho inferior no067 desta fatia; os dois trechos superiores pertencem ao066 público. O registro382, erro operacional de integração, tem topo e trecho intermediário no132 desta fatia; o terceiro trecho pertence ao133 de recursos. Ambos permanecem parciais neste ledger, sem presumir os pixels de outro revisor.

As recapturas examinadas confirmam o vidro persistente de “Como interpretar” aberto e fechado em desktop/mobile; as posições horizontais incluídas dos relatórios, inclusive as colunas de Buscas, foram vistas pessoalmente. “Tempo pago pausado” apresenta o novo WorkspaceSection com vidro em desktop/mobile (boards122/123/125). Os formulários e estados de conta, diálogos de planos, opções de duração e correção de disponibilidade examinados mantêm texto legível e material consistente. Nenhum outro novo defeito obrigatório de material, contraste ou overflow foi confirmado nos pixels atribuídos.

Há uma pendência concreta de captura: `office-loading` desktop, board093, SHA256 `71137600464dce3816fcac55926725a97f8d01187a117044918597d3ec64aa84`, mostra apenas cabeçalho, rodapé e fundo Ondas. O workspace e o skeleton não aparecem, embora os metadados da mesma captura informem os headings,19lentes e2placeholders de carga. A raiz recebeu a divergência; causa ainda não comprovada, sem alteração especulativa de produto. O registro permanece recapture-required e deve ser excluído de reutilização como aprovação visual.

Esta etapa não executou E2E, build, navegador ou operação de runtime. Imagens estáticas não atestam novamente teclado, animação ou rede; os metadados dos runners preservados são evidência separada. Fonte de produto continua congelada. Não declaro ter aberto as fatias001–066 ou133–198.


## Fallback de hidratação da rota

A raiz confirmou no navegador de produção que o conteúdo SSR era temporariamente ocultado durante a hidratação do boundary de Suspense. O fallback anterior era vazio. A mudança fica limitada a `components/layout/route-pending.tsx`, importado no fallback do RootLayout: main.panel-page com aria-busy e data-route-pending, contendo WorkspaceSection “Carregando página” e Loading existentes. Não há transporte, estado, detecção de rota ou CSS novo, nem importação do agregador WorkspacePending e de suas telas.

A story Controles/PagePending usa o mesmo decorator existente com atmosfera Ondas, fontes e tokens reais. A regressão SSR adicionada ao teste do RootLayout real observou RED antes da mudança (fallback inexistente) e GREEN depois: exige heading, região de status, Lens e aria-busy no HTML. A prova anterior da Promise RSC resolvendo na primeira microtask continua intacta e verde com identidade do DOM preservada. Resultado focal:2/2testes; ESLint dos quatro arquivos passou. A raiz coordena typecheck/build e recaptura da produção; nenhum runner E2E, navegador ou servidor foi executado por este agente. Produto novamente congelado.


## Revisão final de gestão com CDP — remainder 017–032

Abri pessoalmente as 16 pranchas atribuídas de `output/ondas-v24/admin-verified-cdp-boards-remainder`:64recortes, cobrindo integralmente26PNGs mobile de390×844 e suas extensões fullPage. São17hashes únicos, todos conferidos contra os bytes originais. Não há fronteira parcial neste lote. O novo ledger próprio é `output/ondas-v24/admin-verified-cdp-remainder-profile-review.json`; não reivindica as pranchas001–016 ou033–048 dos outros revisores.

Os dez registros de posições horizontais incluídos foram examinados, além dos estados de gráficos, tabelas, taxas, listagem de links e ranking de pagadores. As colunas visíveis nos offsets de produtos, estornos, campanhas e links mais clicados mantêm leitura e contêiner local; o corte nas extremidades intermediárias pertence à rolagem da tabela e não ao documento. O popup mobile “Situação dos links” apresenta as seis opções legíveis abaixo do próprio trigger e deixa “Área de gestão” descoberta, confirmando visualmente a recaptura do ajuste de harness anterior. O heading parcial no topo dessa imagem corresponde à captura de viewport após centralização do trigger.

Nenhum novo defeito obrigatório de material Ondas, contraste, corte funcional ou overflow do documento foi encontrado nesta fatia. Os metadados preservados informam zero runtimeErrors e zero violações Axe nos registros; isso continua separado da revisão pessoal de pixels, e as posições horizontais não repetem a análise Axe. Não houve alteração de produto, servidor, navegador, build ou execução E2E por este agente. Fonte permanece congelada.


## Triagem da rodada perfil-final interrompida

Os37contextos de erro existentes foram lidos:36falham na interceptação da segunda fase do readStates antigo; um falha no preparo da coleção de favoritos. Os traces de favoritos-lista, recursos derivados e equipe confirmam unroute, registro do mesmo regex e goto, seguidos de GET200quando o handler de erro não foi chamado. O defeito interno exato do Playwright continua hipótese; o bypass e a ausência de503são observados. O handler persistente já aplicado pelo agente de recursos será validado pela raiz.

O cenário de favoritos populados enviava PUT de item sem body. O trace contém400com Validation error/Required; o schema atual da rota exige expectedVersion. A correção ficou somente no harness: enviar a versão devolvida pela criação real da coleção, mantendo a asserção200. ESLint focal e typecheck E2E passaram, sem execução de runner.

Distribuição contém cinco capturas até a confirmação de destino único, com runtimeErrors/violações vazios nos metadados. Não há trace.zip, error-context ou conclusão dessa jornada na pasta interrompida; não é evidência suficiente para chamá-la falha de produto nem aprovação. O índice de triagem está em `output/ondas-v24/profile-final-failure-triage.json`. Nenhuma fonte de produto foi alterada.


## Revisão pública final de produto — boards 001–050

Abri pessoalmente todas as50pranchas atribuídas de `output/ondas-v24/public-product-final-boards-final`, incluindo200recortes e os trechos inferiores. São125registros envolvidos, dos quais124PNGs completos nesta fatia:64desktop e60mobile, com118hashes únicos completos. Incluindo a fronteira parcial, são119hashes. O ledger próprio `output/ondas-v24/public-product-final-profile-review.json` conserva metadados, cada ocorrência, fonte live/presentation-fixture, SHA256 conferido e resultado da família de teste quando mapeável. O registro124 profile-search-error tem os três primeiros recortes no050 desta fatia e o último no051 do revisor de recursos; continua explicitamente parcial.

Os pixels examinados cobrem fallbacks sem WebGL/observador óptico, coleções e restrição de idade, domínio, detalhes com imagem, busca e recuperação, diretório, convites, canais, campanhas, apresentação e paletas públicas Areia/Editorial/Lavanda/Pêssego/Botânico. As paletas do publicador são preservadas. Não houve nova falta obrigatória de material nesses estados além dos dois achados abaixo. Os cinco casos QA que falharam no runner continuam incompletos; em particular, os dois PNGs detail-approved-cover foram vistos, mas não significam que a jornada posterior de cópia/fallback terminou. Todos os metadados desta fatia informam runtimeErrors/violações vazios, sem transformar isso em acessibilidade total.

O board023 confirma texto claro demais sobre cyan em Limpar filtros, no erro de filtro do catálogo D/M. A raiz comprovou no navegador a regra de link herdado vencendo a cor primária e corrigiu o seletor compartilhado. Os registros54/55 ficam recapture-required; este agente não alterou esse CSS. A observação inicial sobre Voltar à página no canal foi descartada como defeito de texto: o rótulo mobile é escuro e legível, apenas a seta decorativa está clara.

O board050 confirma o erro de busca pública também visto em mobile138pelo revisor de recursos: alerta, barras de skeleton e Próximos links ativo ao mesmo tempo. A fonte ProfileExplorer passava Boolean(error) como pending ao ProfileView, conservando aparência de carga e aria-busy depois da rejeição. A raiz autorizou a correção mínima descrita abaixo. Registro124 e equivalente mobile138exigem recaptura após rebuild; os hashes antigos não aprovam a fonte alterada.

## Erro de busca pública sem carga fictícia

A regressão focal nova observou RED real: depois do alerta, data-skeleton-block ainda existia. Alteração limitada ao ProfileExplorer: pending visual representa somente carga real; no erro a projeção retira itens, canais e blocos sem apagar o conteúdo do estado interno, não renderiza EmptyState falso e bloqueia paginação do cursor antigo. O campo e filtros permanecem; retry usa o mesmo pedido e volta a skeleton somente durante sua carga real. Destinos antigos continuam ausentes, e os hooks de medição/teste continuam bloqueados pelo erro. Não alterei ProfileView, transporte, paletas ou contratos comerciais.

GREEN10/10no arquivo do Explorer, incluindo F18-C02/C04de bloqueio e retentativa, sem remover testes existentes. ESLint dos dois arquivos passou. Fonte congelada e comunicada à raiz antes do rebuild. Testes integrados, tipos globais e capturas finais D/M são coordenados pela raiz; nenhum navegador, servidor, build ou E2E foi executado por este agente.


## Variantes administrativas — revisão de 73 pranchas

Abri pessoalmente todas as pranchas001–044 de `admin-variants-final-boards-final` e001–029 de `admin-variants-recheck-v2-boards-final`, incluindo os recortes inferiores e as posições horizontais. Os ledgers próprios são `output/ondas-v24/admin-variants-final-profile-review.json` e `output/ondas-v24/admin-variants-recheck-v2-profile-review.json`. Cada PNG original e prancha teve SHA256 conferido; os metadados de execução permanecem separados da inspeção humana.

A primeira fatia contém176recortes,81registros envolvidos e80PNGs completos:29desktop e51mobile,74hashes completos únicos. Registro80, settings-impressions-saving mobile, tem apenas o topo no044 comigo; o recorte inferior pertence ao045 do outro revisor. O recheck contém114recortes e48PNGs completos:14desktop e34mobile,41hashes únicos. Não há fronteira parcial no recheck.

Denúncias, moderação e seus estados vazio/erro/carga/recusa/conflito, retenção, configurações e relatórios preservam material e leitura nas áreas vistas. As tabelas foram examinadas também nos offsets adicionais; cortes nas extremidades intermediárias pertencem à rolagem local, com colunas complementadas por capturas sobrepostas. O disclosure de cálculo permanece em vidro aberto e fechado. O seletor de campanha do recheck mostra trigger e ambas opções inteiros na captura de viewport, substituindo a evidência original com Axe target-size.

Dois defeitos de calendário foram enviados à raiz: o cabeçalho do calendário no diálogo de destaque empilha as setas e o mês devido a .form header; a raiz já restringiu para .form > header. No calendário mobile de resultados, a regra de hover mais específica troca o fundo cyan do dia selecionado por surface-subtle e mantém tinta navy; a raiz assumiu a correção. Os respectivos registros estão excluídos até recaptura. A grade e o rodapé completos do calendário foram vistos; o problema não é corte de dias.

Há também um limite de QA: performance-keyboard-tooltip desktop do recheck apresenta foco, mas não a bolha no PNG. A versão mobile contém data11/10/2026 e Impressões60 legíveis. Registrei a necessidade de capturar o estado desktop novamente, sem presumir defeito de produto nem aprovar o estado só pelo nome do arquivo. A rodada original informa21/24passaram e3falhas QA conhecidas; o recheck informa4/4passaram. Isso não valida automaticamente os pixels após as correções novas. Não executei navegador, servidor, build ou E2E.

## Correções de acessibilidade observadas na rodada de perfil

A falha real de integrações vinha de ResponsiveTabs exposto no erro sem os destinos aria-controls correspondentes. WebhooksScreen agora mantém os dois hosts tabpanel com IDs persistentes, deixando oculto o inativo e montando o conteúdo somente quando há estado e a área está ativa. O CSS local respeita hidden apesar do display:grid. Não foram alterados transporte, retentativa, permissões ou avisos. O card de coleção de favoritos removia o texto visível Abrir coleção do nome acessível; agora o nome deriva integralmente do conteúdo, mantendo ícones decorativos. O retorno de foco da coleção continua testado.

Duas regressões novas observaram RED real antes da implementação. GREEN9/9nos testes de CollectionGrid, FavoritesScreen e WebhooksScreen, incluindo ResponsiveTabs real na regressão de erro; ESLint dos cinco arquivos TSX passou. Recaptura e Axe em navegador após rebuild ficam com a raiz.

## Retorno de foco ao cancelar diálogos

Os contextos D60 eD68 mostram perda do foco ao cancelar Alterar destino e Editar grupo. As regressões reproduziram ambos: efeitos dos callers focavam o título ao fechar. A primeira correção revelou um problema comum adicional: cleanup do OverlayDialog restaurava foco antes da mutação e React voltava ao botão Fechar ainda montado no diálogo fechado. Um teste isolado da primitiva observou o mesmo RED; instrumentação temporária foi removida após confirmar a ordem.

OverlayDialog agora repete o retorno no layout do estado fechado, depois do commit, e conserva o cleanup para desmontagem. RedirectScreen e ProfileGroupManager informam os acionadores explicitamente e reservam foco no título para navegação a outro detalhe/grupo. Confirmação que remove o acionador mantém a região estável: Adicionar grupo recebe foco. Nenhum atraso, mudança de regra ou relaxamento de QA foi introduzido.

GREEN16/16na primitiva e nos dois callers, com7/7do grupo repetidos após o último ajuste do guard; ESLint dos seis arquivos passou. O inventário rg encontrou74ocorrências de OverlayDialog/returnFocusTo; isso não representa revisão individual de todos os callers. A fonte foi congelada e comunicada à raiz para build e regressões integradas. Nenhum E2E ou servidor foi executado por este agente.


## Auditoria final de checkbox/radio e carregamento da equipe

A captura de Modelos129–130 mostrou controles azuis nativos na etapa Aplicar. Troquei os dois inputs do TemplatePreviewDialog pela Checkbox existente, conservando checked, required, disabled e callbacks. As regras de preservar conteúdo e exigir confirmação para substituir permanecem:5/5testes afetados passaram e ESLint passou.

A auditoria dirigida percorreu todos os inputs de produção com rg e AST TypeScript, incluindo declarações multiline. Além de Modelos, havia19checkboxes e6radios em16arquivos de plataforma. Foram substituídos por Checkbox e Input type=radio existentes, com as mesmas propriedades e handlers. A lista de arquivos e quantidades está em `output/ondas-v24/checkbox-material-migration.json`. O consenso de cookies fica fora de InteractionPolicy no RootLayout; a composição de política não foi alterada. O inventário final contém somente o input interno da própria Checkbox e o switch Mostrar título do editor de canais, que já implementa trilho/thumb, foco, cores e fallback forced-colors próprios; não foi sobreposto com um checkmark de checkbox. Nenhum desses controles pertencia a uma paleta publicada do usuário.

Os cartões vazios na carga da equipe não eram um frame de animação: WorkspaceTeamScreen montava dois hosts com Lens e nenhum Skeleton filho; .pending animava somente opacidade. Acrescentei três blocos Skeleton existentes dentro de cada host. A regressão observou RED por zero blocos e GREEN depois, preservando aria-busy, ações desabilitadas e ausência de transporte em pendingOnly.

Verificação afetada:15arquivos e51testes passaram, incluindo consentimento, permissões, checkout, importação, canais, apresentação, grupos e agenda. ESLint dos18arquivos alterados passou. Os testes de Modelos5/5são um lote anterior separado. Fonte congelada e comunicada à raiz; build, typecheck integrado, E2E e recapturas desktop/mobile continuam coordenados por ela.

## Revisão somente leitura do impacto do OverlayDialog

A análise AST atual localizou64montagens de produto, das quais42declaram returnFocusTo e22dependem do retorno nativo ou de efeito do caller. Isso substitui a contagem rg anterior de74ocorrências textuais, que incluía imports/atributos. O ajuste novo só repete o foco após o commit quando há alvo conectado e a janela passou de aberta a fechada; não mudou trap, cancel, camada modal ou overflow. SiteNavigation tem foco próprio no fechamento; Favorites foca o status no sucesso e o título somente na navegação. Não encontrei nova regressão concreta nessa revisão pequena. Os22callers sem alvo explícito e sucesso enquanto o acionador permanece disabled não estão certificados por esses units; dependem da validação integrada e das interações reais. Não acrescentei fallback global ou novos patches por hipótese.


### Perfil completo: restantes001–077 (2026-10-24)

Abridas pessoalmente todas77pranchas/306recortes,216PNGs completos. Ledger: `output/ondas-v24/profile-complete-final-remainder-profile-review.json`, hashes de originais e pranchas verificados. Excluídos controles antigos pré-migração, loading vazio da equipe,2popups de cor incompletos e2restantes de menu não capturados. Novos achados152/153 (feedback min/max sobre borda) e185 (erro+vazio de equipe) corrigidos minimamente: WorkspaceFilters feedback com margem positiva; TeamScreen/WorkspaceTeamScreen só declaram vazio após DTO real sem erro, preservando dados anteriores. RED dos dois vazios observado; GREEN12/12 em3arquivos, ESLint4arquivos verde. Sem E2E/build/servidor próprio; novas imagens pendentes da fila raiz.


### Recapturas finais de variantes/primitivas

Quatro lotes renderizados somente a partir dos PNGs locais, com índice de hashes já abertos. Abertas todas34pranchas/129recortes/73PNGs novos: calendário+assinatura13/52/34; hover de calendário4/14/14; tooltip de desempenho16/61/23; diálogo/foco1/2/2. Ledgers próprios `output/ondas-v24/{admin-variants-calendar-subscription-final,calendar-hover-final,performance-tooltip-final,dialog-forms-focus-final}-profile-review.json`. SHA256 verificados; nenhum novo defeito obrigatório. Seleção do calendário segue legível em hover, popup no diálogo está inteiro, tooltip desktop/mobile está efetivamente visível. As2imagens novas da fila dialog/focus são etapas2/3; demais omitidas pelo índice de igualdade de SHA, sem alegar nova abertura. Nenhum teste de navegador/build/servidor foi executado por este revisor.


### Equipe, permissões e feedback das datas — recapturas finais

Abri pessoalmente todas17pranchas/67recortes/49PNGs de `team-date-feedback-complete-boards-final` e4pranchas/14recortes/12PNGs de `permissions-calendar-material-final-boards-final`. Os ledgers próprios são `output/ondas-v24/team-date-feedback-complete-profile-review.json` e `output/ondas-v24/permissions-calendar-material-final-profile-review.json`, com SHA256 de cada original e prancha conferido e todas as ocorrências preservadas. Não foi encontrado novo defeito obrigatório nas áreas vistas.

No lote atual, os estados de erro de equipe D/M não mostram falso vazio; os dados vazios legítimos continuam nos estados com leitura bem-sucedida. Os cartões de carregamento contêm os blocos Skeleton, e as mensagens min/max das datas ficam abaixo da borda. Foram examinados também os papéis, permissões com rolagem interna, convites, revogação, acesso encerrado, prévia e carteira de páginas. A prévia normal mantém a paleta clara do publicador. O JSON atual registra4/4passaram, sem runtimeErrors ou violações Axe nos metadados dos49registros vistos.

O lote anterior de permissões/calendário registra2/4passaram, com duas falhas antigas de geometria. Seus12PNGs não incluem um hint inválido; portanto não aprovam a etapa malsucedida nem os pixels antigos ausentes. Os controles e estados realmente presentes foram examinados; a evidência atual do feedback está no lote4/4. A revisão estática não representa certificação global de foco/movimento/acessibilidade. Não executei E2E, build, navegador do produto ou servidor.

### Confirmação para desativar endereço

A raiz confirmou nos pixels o aviso sem Lens da confirmação em `/painel/convites`. A fonte já compunha um host isolado transparente, mas não montava o material. Acrescentei somente LiquidLens12 no host e alinhei o raio da classe warning a12px no CSS local. POST, expectedRevision, confirmação, cancelamento e pending permanecem intactos. Os5/5testes de RedirectScreen passaram e ESLint do arquivo passou; fonte congelada e entregue à raiz. A recaptura D/M após novo build permanece na fila raiz.


### Confirmação de desativação — recaptura após build final

Renderizei offline o lote `redirect-confirmation-complete` com o índice atual e abri pessoalmente todas4pranchas/15recortes/10PNGs novos. Ledger: `output/ondas-v24/redirect-confirmation-complete-profile-review.json`; SHA256 dos originais e pranchas conferidos. O JSON da fila raiz registra2/2passaram. O aviso Confirmar desativação agora mostra Lens e raio coerente12px em desktop/mobile, com tinta âmbar, texto e ambas ações inteiros nos trechos inferiores. O diálogo Alterar destino, calendário e histórico também foram examinados nas imagens presentes. Nenhum novo defeito obrigatório. A confirmação antes pendente está fechada visualmente nesta evidência; contratos permanecem cobertos pelos5/5units anteriores e pela fila raiz. Não alterei fonte, runtime, build ou testes de navegador nesta revisão.


### Demo reiniciada — revisão suplementar

Abri pessoalmente todas11pranchas/43recortes/9PNGs de `demo-restart-verified-boards-final`, incluindo os trechos inferiores da home e dos detalhes. Ledger: `output/ondas-v24/demo-restart-verified-profile-review.json`; hashes dos originais e pranchas conferidos. Home, detalhe, sugestões, imagens, vidro e rodapé foram examinados em desktop/mobile, sem novo defeito obrigatório nos7registros válidos. O popup cobre intencionalmente a faixa de categorias enquanto aberto, sem colisão de texto ou recorte de conteúdo observados.

Os2PNGs mobile before-offscreen-lazy-images permanecem explicitamente excluídos: foram obtidos antes de rolar as imagens lazy fora do viewport, e não demonstram falha de produto. As substituições home/search-all-images-decoded mostram as capas carregadas e foram abertas integralmente. A raiz relatou carga das10imagens após rolagem, zero erros de console e zero overflow horizontal em sua inspeção MCP; este revisor não refez essas medições. Nenhum Axe manual ou novo teste automatizado é alegado por este lote. Fonte e runtime intactos.


### Reconciliação semântica final de perfil/painel

Percorri o inventário completo das31rotas `/painel`, `/painel/visao` e `/painel/perfil*`:726artefatos e554combinações nominais rota×estado×dispositivo.540já possuem pixels elegíveis, revisão por hash e cenário PASS no inventário. As14restantes foram verificadas por arquivo: reabri os14PNGs atuais completos (12SHA únicos), conferi seus metadados, loading, ausência de overflow, runtime/Axe capturados vazios e cenário associado PASS. Ledger estreito: `output/ondas-v24/closure-evidence-profile-current-review.json`; mapeamento de todas554combinações: `output/ondas-v24/closure-evidence-profile-diagnostic.json`.

As lacunas nominais eram painel base/vazio mobile e alias, assistente carregando mobile, campanha métricas erro mobile, canais base D/M, idiomas carregando/sem-página D/M, grupo aberto desktop e testes base D/M. Exclusões históricas por SHA vinham de erro antigo com pixels prontos, anotação de material em ramos não montados no skeleton/vazio, ou cenário antigo que falhou depois da captura. A confirmação atual é limitada ao par arquivo+SHA e seu estado nominal; todas anotações/rejeições antigas permanecem. O grupo usa apenas a captura posterior profile-material-final cujo cenário completo passou. O alias afirma a URL final e a fonte confirma redirect('/painel'). Não restou captura pendente nessa fatia após as confirmações explícitas. Nenhum runtime/browser/E2E foi executado e nenhuma fonte foi alterada.
