# Acesso visível à configuração da segmentação

O acesso à edição ficava dentro de um details com uma única ação, exigindo descobrir e abrir o menu antes de editar. Agora existe o botão secundário Configurar segmentação no cabeçalho, com ícone de edição e acesso direto ao formulário existente. Ele permanece nas abas Grupos, Ofertas e Envios. Não foram criadas rotas, permissões, novas opções ou configurações paralelas.

No mobile, somente Voltar/Segmentações mantém o recuo sem padding inicial; o novo botão preserva o espaçamento padrão. O teste de jornada agora abre a edição diretamente, confere a opção Mostrar tela de convite e verifica o retorno do foco ao fechar. Sem dependências ou mudança de regras.

Verificação local aprovada: lint, tipos, build, 924 testes frontend e oito E2E afetados em desktop/mobile (incluindo 320, 390 e 430 px). Capturas reais da jornada inspecionadas em desktop e mobile; botão visível acima da preparação e sem overflow de página. Screenshots em output/settings-access-desktop.png e output/settings-access-mobile.png. Capturas inicialmente gravadas pelo caminho relativo do teste foram copiadas ao workspace. Grafo incremental: 8551 nós/30801 relações, sem LLM/API; CSS não é modelado. Não há alteração backend ou migração. Reversão: reverter a troca do menu por botão e seu seletor CSS.
