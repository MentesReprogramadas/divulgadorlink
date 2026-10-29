# Afiliados: clareza dos formulários e QR automático

Correção solicitada pelo operador a partir da captura do modal. Implementação local em `C:/VSCODE/temlink-afiliados`, preservando cadastros existentes e a pasta original. Sem commit, push ou deploy.

## Comportamento

- O cadastro de conexão deixou de pedir chave técnica. Usa a configuração segura já existente no servidor; a API mantém compatibilidade e suas restrições de tenant.
- **Nome para identificar esta conta** é um apelido interno, como Principal 01. **Participante inicial dos grupos** é outro WhatsApp que será incluído nos novos grupos criados automaticamente. Esse campo não identifica o telefone que lê o QR nem concede papel administrativo a esse participante.
- **Nome da segmentação** organiza o tema no painel. **Nome dos grupos no WhatsApp** define o nome público acrescido da sequência. Nome, foto e descrição servem aos novos grupos; editar o modelo não renomeia grupos existentes automaticamente.
- A migration aditiva `20261028220000_affiliate_group_name` adiciona `groupName` e copia os nomes anteriores, sem apagar registros. A criação e a reconciliação usam o nome público; o convite também o exibe. PATCH do tema interno não altera o nome público. Clientes anteriores continuam com fallback.
- Salvar uma nova conta abre a conexão e solicita o QR, tanto no assistente quanto na tela de conexões. Se o QR ainda não estiver disponível, aguarda e consulta a mesma conexão até cinco vezes, com intervalo de1,5s. Falhar/renovar QR nunca repete o cadastro da conta.
- A gravação do cadastro bloqueia fechamento até a resposta; depois de salva, o QR pode ser fechado, cancelando novas consultas. Respostas atrasadas não reabrem outro editor. Ao editar contas diferentes, o formulário é remontado com os dados corretos de cada conta.
- Ações do fluxo usam os ícones existentes, com rótulos acessíveis. O modal mantém sua moldura e cabeçalho; somente o corpo rola. Foi removida a lente duplicada do cabeçalho dos modais. O drawer/sidebar conserva seu material e comportamento.
- A troca de etapa retorna a rolagem ao topo do assistente e foca o novo título, mantendo o indicador de progresso visível no celular.

## Evidência

O navegador isolado, com login/BFF reais, solicitou o QR da conta **Principal 01**, já cadastrada pelo operador. Resposta200 e QR visível, sem cadastrar outra conta local, ler o código ou enviar mensagem. Não foram importadas instâncias/grupos do VHG.

A moldura foi inspecionada em desktop1440 e mobile390. No desktop, o corpo rolou613px enquanto `dialog.scrollTop` permaneceu0 e o cabeçalho manteve `y=16`, altura77. No mobile, cabeçalho em `y=8`, sem overflow horizontal. As capturas locais ficam em `output/local-affiliates/form-clarity/`; não foi armazenada captura do QR real.

O detector mecânico Impeccable retornou lista vazia nos componentes alterados. Isso não substitui a inspeção: as capturas foram abertas para conferir borda contínua, campos, ícones e rolagem. A revisão independente encontrou duas corridas de estado e a reutilização de campos entre contas; foram corrigidas com testes de regressão.

Backend:47 testes afetados em4 arquivos passaram, incluindo PostgreSQL, criação/reconciliação com nomes diferentes, convite e preservação no PATCH. Prisma validate/generate, lint, typecheck e build aprovados. Quatro testes do OverlayDialog passaram separadamente.

Dois E2E integrados desktop/mobile passaram com API3352, provedor4453 e banco de regressão separados: persistência de segmentação, expansão de convite e entregas simuladas. Esses serviços de teste foram encerrados; o painel3016, API3351, ponte4452 e worker reais permanecem ativos.

Frontend:37 testes dirigidos em7 arquivos passaram após as correções de concorrência e edição;17 foram repetidos após o último ajuste e passaram. A suíte completa anterior passou com852 testes/220arquivos; não confundir essa rodada anterior com os testes dirigidos posteriores. Seis E2E determinísticos finais desktop/mobile passaram, além dos dois integrados, incluindo QR automático, indicadores inteiros no topo, cabeçalho dentro da moldura e ausência de rolagem no dialog/panel. Lint/typecheck completos aprovados. O build final foi refeito após o congelamento do código, separado do dev3016, e concluiu com exit0.

Na conferência final real, tanto desktop1440 quanto mobile390 mantiveram `body.scrollTop=0`, `panel.scrollTop=0` e `dialog.scrollTop=0` ao trocar de etapa; o cabeçalho coincidiu com o topo da moldura, o stepper ficou inteiro e não houve overflow horizontal. A restauração altera somente a rolagem do corpo, sem chamar scrollIntoView no assistente e mover seus ancestrais.

## Limites e reversão

A leitura do QR depende do telefone do operador. Não houve envio real, compra ou comissão nesta correção. A participação das contas de reserva nos grupos continua necessária e não é alterada pelo formulário. O novo nome não modifica grupos já criados.

Para desfazer, reverter somente esta fatia de campos/jornada/modal após revisar o diff; não resetar a worktree inteira, que contém o restante da feature. A coluna nova pode permanecer inerte e deve ser preservada se já houver nomes diferentes cadastrados. Não apagar dados do operador nem reverter migrations usadas sem backup.
