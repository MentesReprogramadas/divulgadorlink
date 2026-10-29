# Clareza da conexão e identidade dos grupos

O cadastro usa um apelido para identificar a conta e o número de um participante inicial dos novos grupos. Esse participante não representa o telefone conectado: a conta que cria os grupos é pareada lendo o QR no celular. A chave técnica saiu dos formulários e do payload de UI; a configuração continua no servidor.

Nome da segmentação e nome dos grupos no WhatsApp são campos separados. O primeiro organiza o tema interno e o endereço do convite; o segundo define o nome dos novos grupos numerados. A revisão final apresenta ambos e informa que editar o modelo não renomeia grupos existentes.

Salvar uma conta abre automaticamente a etapa do QR nas duas entradas: cadastro na área de conexões e cadastro dentro da segmentação. Quando o provedor ainda prepara o código, o painel consulta a mesma conta até cinco vezes, com intervalo de1,5s. Nunca repete o cadastro por falha de QR. Fechar o fluxo interrompe novas consultas e cancela a espera de rede; o registro já salvo é preservado. A conferência de conexão no servidor continua exigida para finalizar a segmentação.

O fechamento fica bloqueado apenas enquanto o cadastro está sendo persistido. O QR já aberto pode ser cancelado. Respostas atrasadas de QR ou conferência não reabrem ou fecham outro formulário; a edição de contas usa identidade estável para não levar o participante da conta anterior para outra conta.

Os botões do fluxo reutilizam os desenhos canônicos: save para persistência, back para voltar, next para avançar, qr para pareamento, refresh para consulta de estado, edit para edição e plus para criação. Ícones são decorativos e mantêm os rótulos acessíveis.

A regressão visual rola o formulário longo sem mover o quadro ou o cabeçalho do modal; ao mudar de etapa, o corpo volta ao topo e mantém todos os passos visíveis. Capturas `*-segment-modal-scrolled.png` e `*-segment-connections.png` foram feitas em desktop e celular. Os testes com QR usam fixture explícita; não comprovam pareamento de telefone real.
