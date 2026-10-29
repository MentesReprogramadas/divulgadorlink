# Afiliados: acesso e navegação no celular

O usuário do e-mail solicitado foi conferido em produção por identificador de e-mail ativo: ADMIN/ACTIVE, tenant `temlinkaqui.com`, mesmo ator autenticado usado na configuração. Seis ações de criação auditadas correspondem a esse usuário. Natal, Principal 01 e o grupo real #03 já estavam nesse ambiente. A operação é administrativa por tenant; não foi criada uma propriedade por usuário nem alterada qualquer permissão.

## Diagnóstico e alteração

O menu principal tinha 435 px de conteúdo em apenas 176 px disponíveis no viewport de 320 px, porque compartilhava a linha com Ferramentas. As abas de produtos também ficavam cortadas. O documento inteiro não excedeu a largura na medição inicial, mas havia conteúdo inacessível sem rolagem dentro das listas de abas.

| Antes | Depois | Por quê |
| --- | --- | --- |
| Menu principal comprimido ao lado de Ferramentas | Menu em duas colunas abaixo de 40rem, Ferramentas em outra linha | Todas as quatro áreas ficam visíveis |
| Abas internas cortadas | Largura disponível distribuída e quebra de linha conforme conteúdo | Manter nomes completos e alvos de pelo menos 44px |
| Mais opções espremido na conexão | Base flexível de 10rem permite outra linha | Evitar quebra de uma palavra em várias linhas |

`TabNavigation` recebe somente uma classe opcional para permitir o estilo local. Outros consumidores mantêm o CSS anterior. As três chamadas de afiliados adotam o estilo; nenhuma biblioteca, select, regra de autorização ou contrato de API foi adicionado.

## Verificação

- Regressão nova falhou antes da correção: 247 px de conteúdo excedente na lista de abas.
- Navegador real via Playwright, dados isolados: Início, Segmentações, WhatsApp, Envios, catálogo e abas internas de segmentação/produtos em 320, 390 e 430 px. Verifica largura de cada aba e lista, largura do documento, alvo mínimo de 44px, teclado e texto ampliado a 200%.
- Capturas locais inspecionadas em `output/mobile-overview-320.png`, `output/mobile-products-320.png`, `output/mobile-settings-320.png` e `output/mobile-connections-320.png`. A primeira alternativa de rótulos compactos foi rejeitada por Axe; a versão final preserva os nomes completos.
- Lint/tipos, 914 testes unitários e build aprovados. Detector mecânico Impeccable sem achados nos arquivos alterados; não substitui a inspeção real.
- Grafo incremental local code-only: 11 arquivos reprocessados na passagem final, 8547 nós/30789 relações. CSS e imagens não são cobertos pelo grafo. Nenhum envio a serviço externo nessa extração.

E2E final: 18/18 aprovados, incluindo Axe, desktop e celular. No primeiro CI (40865459793), as oito jornadas existentes passaram em cada projeto, mas o teste agregado de três larguras excedeu 60s. O trace confirma navegação até a última largura sem falha de layout. Cada largura agora é um teste independente, preservando os mesmos asserts e o limite de 60s; não houve ajuste de runtime ou aumento de timeout. Os seis casos separados passaram localmente (9–11s por caso); typecheck também passou. A nova execução de CI e publicação serão conferidas após o push. Não houve novo envio de produto no WhatsApp. Não foram usados dispositivos físicos; a conferência móvel usa Chromium com viewport controlado. Após o usuário informar a promoção da conta, a consulta real confirmou três participantes; o fluxo público de convite recuperou e salvou o convite do #03. A conferência administrativa retornou inviteAvailable=true, um único grupo e um único broadcast. Nenhum grupo adicional ou mensagem foi criado.

Reversão: reverter o commit desta correção e publicar pelo mesmo CI. Não há migration nem alteração de dados a desfazer.

## Bloqueio adicional de CI

CI 40866374880 aprovou as duas suítes de afiliados com os casos separados. SEO mobile detectou ERR_ABORTED quando o teste iniciava page.goto enquanto a recusa de idade ainda navegava para o mesmo documento. Os três pontos de recusa da suíte SEO agora esperam domcontentloaded junto ao clique; política de idade e runtime permanecem iguais. Verificação em banco/containers próprios, com offset de portas 24000 para preservar os serviços locais.

Após a correção de espera, 20/20 E2E SEO desktop/mobile e typecheck passaram localmente. Os containers isolados foram removidos pelo teardown; a porta local 3016 foi preservada.

## Bloqueios reais adicionais da publicação

CI 40868151967 aprovou afiliados e SEO, mas falhou no filtro público e na acessibilidade da sidebar. Nos filtros, respostas RSC terminaram com referências assíncronas sem resolução e a URL/estado de navegação podiam ficar pendentes. O erro também apareceu localmente: uma das três repetições falhou ao limpar a cidade. Resolver o conteúdo da home antes de outra boundary não solucionou o problema (três falhas em seis repetições); essa hipótese foi revertida integralmente.

A solução final mantém os mesmos filtros, validação, URLs, cursor e SSR, usando navegação de documento. Guarda somente caminho, índice do controle e posição de rolagem em sessionStorage; restaura uma vez apenas no caminho correspondente, com índice limitado e rolagem finita. Aguarda o idioma ficar habilitado antes de devolver foco, reabre o painel de filtros e limpa o estado de carregamento em pageshow. Storage bloqueado não impede a navegação. Sete testes do componente passaram, incluindo os cinco casos novos; seis repetições consecutivas do E2E antes instável passaram (mais o setup).

A região rolável da sidebar agora tem nome, foco de teclado e contorno visível, tanto pronta quanto pendente. O E2E W04 preserva sua auditoria Axe e exige foco nessa região no desktop. Não se alterou logout, sessão ou autorização.

Verificação final atual: lint/tipos e 919 testes unitários aprovados; detector mecânico sem achados. Nove jornadas de regressão desktop/mobile (incluindo setup, três casos de descoberta e W04 por projeto) e build aprovados. A causa interna do stream Next/React não foi comprovada; a correção evita esse transporte nos filtros, sem upgrade de dependências nem supressão de erros/testes.
