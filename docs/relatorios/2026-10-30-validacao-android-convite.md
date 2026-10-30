# Convite Natal: validação em Android virtual

## Resultado observado

Em 30/10/2026, o convite de produção foi testado em Android 15 (API 35), executado pelo emulador oficial Google 37.2.13, com Chrome 124.0.6367.219 da imagem oficial e WhatsApp baixado diretamente do site oficial (versionName instalado 2.26.43.72).

- 09h21 BRT: um toque no link do Tem Link Aqui recebeu HTTP 307 e abriu o aplicativo nativo `com.whatsapp/.registration.app.EULA`. Cabeçalhos do redirecionamento chegaram em 1.755 ms nesse ambiente de diagnóstico.
- 09h23 BRT: um toque no convite direto do WhatsApp também abriu o aplicativo nativo.
- `net::ERR_ABORTED` na navegação web acompanhou a transferência para o aplicativo; não foi tratado como falha quando a atividade nativa confirmou a abertura.
- Nenhuma conta foi conectada, nenhuma entrada/saída de participante ou envio de mensagem foi executado.

Evidências locais ignoradas pelo Git: `output/android-validation/browser-result-redirect.json`, `browser-result-direct.json`, `chrome-android-redirect.png`, `chrome-android-direct.png` e `whatsapp-welcome-android15.png`. Os dois relatórios registram `nativeWhatsApp: true` e a atividade nativa observada.

## Ambiente e limites

O host tem VPN ativa. A rede direta do emulador não alcançou a internet. Para testar navegação, foi utilizado proxy HTTP CONNECT local por túnel ADB, sem interceptação TLS. Isso não reproduz latência de rede móvel; 1.755 ms não é benchmark de abertura em um telefone físico.

Uma tentativa inicial passou o cabeçalho diagnóstico a todos os domínios, causando falhas em recursos externos do WhatsApp. O teste foi corrigido para restringir o cabeçalho `x-analytics-test` ao domínio do Tem Link Aqui. As tentativas com erro não foram usadas como evidência de falha do produto.

Chrome 83 da primeira imagem Android 11 não era compatível com a automação utilizada. Um snapshot Chromium ARM também falhou nesse ambiente. Esses resultados de infraestrutura não foram classificados como defeitos do convite.

O teste válido executou um toque em um link HTML no Chrome Android. Não executou anúncio real dentro do Instagram, não valida todos os navegadores internos, fabricantes, versões ou configurações de App Links. O WhatsApp exibiu aviso de ROM personalizada, próprio desse ambiente virtual. Não houve tentativa de contornar a detecção.

## Próximo requisito para entrada real

Uma conta WhatsApp conectada é necessária para ultrapassar a configuração inicial e validar o ingresso no grupo. Foi solicitada autorização explícita para vinculação por QR code como dispositivo adicional usando o iPhone, explicando a sincronização de mensagens. Até autorização e conexão, não se considera validada a entrada efetiva ou o evento de associação ao grupo.

Não houve alteração de código do produto, campanha ou produção nesta validação.

## Vinculação: correção da infraestrutura do teste

Após autorização para vincular como dispositivo adicional, o usuário relatou QR inválido/expirado e depois mensagem genérica de conexão. A expiração observada no Android não estabelece, sozinha, a causa do erro no iPhone.

Foi identificada cobertura incompleta da rede: o proxy do navegador/sistema não atendia todo o tráfego TCP do aplicativo. O emulador foi reiniciado com `-http-proxy` (túnel de TCP sem inspeção TLS) e `-feature -WiFiPacketStream`, mantendo o encaminhamento DNS de teste restrito a `127.0.0.2:53`. O DNS do sistema e a VPN do host não foram modificados. O encaminhador local passou seu teste de consulta/resposta e o Android voltou a resolver `example.com`. O túnel registrou conexões TCP estabelecidas; isso ainda não comprova o sucesso da autenticação do WhatsApp.

Uma visualização temporária do QR foi disponibilizada somente em loopback, na porta 8770, com caminho aleatório, validação de Host/origem de navegação e respostas `no-store`. O endpoint confere a atividade nativa antes e depois da captura: somente a tela de vinculação pode ser exibida; ao sair dela, retorna 204 e encerra a exibição. Não captura/serve a lista de conversas após o login. O endereço secreto temporário não é registrado neste documento.

Até a confirmação efetiva de conexão, não considerar a conta vinculada nem o fluxo de entrada validado. Nenhum número foi registrado como conta principal.

## Resultado autenticado

A conta foi vinculada como dispositivo adicional e chegou a `com.whatsapp/.home.ui.HomeActivity`. O endpoint de QR retornou 204 após a mudança, encerrando a exibição antes de qualquer captura de conversas.

1. Às 09h54 BRT, o link público recebeu HTTP 307, abriu a atividade nativa de conversa e apresentou o nome esperado do grupo. A conferência de participantes confirmou que a conta já era membro; esse teste não criou entrada.
2. O usuário informou que saiu do grupo. A conferência às 09h56 BRT confirmou 4 participantes e ausência da conta de teste. O webhook havia registrado 1 saída às 09h55m42s BRT.
3. O convite foi aberto novamente pelo Chrome Android e apresentou o botão nativo `Join group`. Foi conferido o nome exato do grupo antes de pressioná-lo uma única vez.
4. A conferência às 09h58m30s BRT confirmou 5 participantes e presença da conta. O webhook registrou 1 reentrada às 09h58m12s BRT, com 1 saída e nenhuma entrada nova ou evento duplicado. O botão nativo mudou para `View group`.

Evidências sem conversas privadas: `output/android-validation/linked-invite-result.json`, `group-join-result.json` e consultas operacionais com contagens/booleanos. O arquivo `linked-invite-result.json` foi reutilizado na segunda abertura e registra a atividade Home com o convite em bottom sheet; o resultado de conversa mencionado no primeiro passo foi observado na execução anterior, não deve ser inferido do arquivo sobrescrito.

Nenhuma mensagem foi enviada. A reentrada de uma conta que já constava da linha de base é contabilizada como reentrada, não como aquisição de novo participante ou atribuição ao anúncio.

Foi acionado `Settings > Account > Log out` no próprio dispositivo adicional e confirmada a opção `Log out` (distinta de exclusão de conta). A limpeza dos dados locais de teste deve ser registrada após a confirmação da tela de registro.

Fechamento: após reabrir o aplicativo, foi confirmada a atividade `com.whatsapp/.registration.app.EULA`, comprovando o logout local. Em seguida, `pm clear com.whatsapp` retornou `Success`, o emulador foi encerrado e os quatro helpers locais de proxy/DNS/visualização foram parados. A revisão automática bloqueou o comando de remoção recursiva da pasta AVD; essa remoção não foi declarada concluída. Não foi tentado contornar a rejeição com outro mecanismo de exclusão.

## Referências oficiais

- https://developer.android.com/studio/run/emulator-commandline
- https://developer.android.com/studio/run/emulator-acceleration
- https://www.whatsapp.com/download/android
- https://developer.chrome.com/docs/android/intents
- https://developer.android.com/training/app-links/verify-applinks
