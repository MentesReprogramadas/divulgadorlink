# Acesso visível à configuração da segmentação

O acesso à edição ficava dentro de um details com uma única ação, exigindo descobrir e abrir o menu antes de editar. Agora existe o botão secundário Configurar segmentação no cabeçalho, com ícone de edição e acesso direto ao formulário existente. Ele permanece nas abas Grupos, Ofertas e Envios. Não foram criadas rotas, permissões, novas opções ou configurações paralelas.

No mobile, somente Voltar/Segmentações mantém o recuo sem padding inicial; o novo botão preserva o espaçamento padrão. O teste de jornada agora abre a edição diretamente, confere a opção Mostrar tela de convite e verifica o retorno do foco ao fechar. Sem dependências ou mudança de regras.

Verificação local aprovada: lint, tipos, build, 924 testes frontend e oito E2E afetados em desktop/mobile (incluindo 320, 390 e 430 px). Capturas reais da jornada inspecionadas em desktop e mobile; botão visível acima da preparação e sem overflow de página. Screenshots em output/settings-access-desktop.png e output/settings-access-mobile.png. Capturas inicialmente gravadas pelo caminho relativo do teste foram copiadas ao workspace. Grafo incremental: 8551 nós/30801 relações, sem LLM/API; CSS não é modelado. Não há alteração backend ou migração. Reversão: reverter a troca do menu por botão e seu seletor CSS.


Fechamento de produção: SHA ca7af9444dc347911262817c0a9c64c321e46940, CI 40909862824 aprovado 25/25. Web/API/bridge healthy e worker running:unknown (sem readiness HTTP), todos no mesmo SHA. Playwright MCP conferiu o frontend publicado com fixtures isoladas da API: botão Configurar segmentação acima da dobra em 390×844, modal abre, opção Mostrar tela de convite acessível, retorno de foco ao fechar e ausência de overflow de página. Não houve login real, gravação de configurações ou envio de ofertas nesse teste; não é prova de backend em produção. Backend não mudou nesta fatia. Captura: output/settings-access-production-mobile.png. Mobile por emulação, sem aparelho físico.

As oito capturas novas inicialmente gravadas fora do workspace pelo caminho relativo do teste foram removidas por nome e data de criação, após cópia ao output. Nenhum diretório foi removido recursivamente. Notas finais acrescentadas apenas localmente para evitar novo deploy por documentação.
