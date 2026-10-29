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

E2E final: 18/18 aprovados, incluindo Axe, desktop e celular. No primeiro CI (40865459793), as oito jornadas existentes passaram em cada projeto, mas o teste agregado de três larguras excedeu 60s. O trace confirma navegação até a última largura sem falha de layout. Cada largura agora é um teste independente, preservando os mesmos asserts e o limite de 60s; não houve ajuste de runtime ou aumento de timeout. Os seis casos separados passaram localmente (9–11s por caso); typecheck também passou. A nova execução de CI e publicação serão conferidas após o push. Não houve novo envio de produto no WhatsApp. Não foram usados dispositivos físicos; a conferência móvel usa Chromium com viewport controlado. Convites do grupo #03 ainda dependem da conta administradora no WhatsApp, conforme relatório de produção.

Reversão: reverter o commit desta correção e publicar pelo mesmo CI. Não há migration nem alteração de dados a desfazer.
