# Sidebar mais espaçosa — 19/10/2026

A coluna lateral passou de 216px para 280–320px conforme a tela. Itens têm altura mínima de 48px e mais espaço vertical; títulos de subseções usam 16px. O recuo principal dos submenus passou de 37px para 20px, preservando a hierarquia com linha lateral. A referência é a própria sidebar com Minha página expandida, conforme o pedido. O conteúdo principal continua fluido e o menu mobile mantém a composição existente.

Alterações: frontend/src/features/account/components/workspace.module.css e caso W10 em frontend/e2e/workspace-layout.spec.ts. Nenhum ícone, destino ou contrato de acesso alterado.

Validação: lint passou; typecheck passou após o build (a primeira tentativa ocorreu enquanto o build recriava .next-e2e/types e precisou ser repetida); 14 testes de componentes de navegação/ícones passaram. Build de produção executado pelo setup E2E passou. Com E2E_PORT_OFFSET=12000 e E2E_RUN_ID=workspace-sidebar, npm run test:e2e -- workspace-layout.spec.ts --project=features --project=features-mobile --grep 'W09|W10|W04' passou: 7 testes incluindo setup.

W10 abre Minha página e as três subseções em 1024, 1440, 1920, 390 e 320px, verifica largura útil dos rótulos longos, altura de clique, ausência de corte/overflow, Axe, abertura por teclado e navegação para Apresentação para parceiros. W09 verifica painel/admin em cinco larguras e fonte a 200%, com Escape e retorno de foco do menu. W04 verifica saída da conta. Capturas desktop/mobile com submenus abertos foram examinadas. desktop.png e mobile.png mostram a parte inferior dos grupos, após rolagem para os itens longos.

Limites: fonte ampliada não equivale a inspeção manual de zoom em todas as páginas; sem dispositivo físico, produção ou certificação integral de acessibilidade. Não houve commit, push ou deploy.

Reversão: desfazer somente o tamanho da coluna, altura/padding dos links e summary, tamanho do título de subseção, recuo e overflow-wrap desta etapa e remover W10. Preservar o ajuste anterior de largura geral e as demais alterações existentes.
