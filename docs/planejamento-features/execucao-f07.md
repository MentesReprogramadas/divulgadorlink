# F07 — acompanhamento de disponibilidade

## D08 — decisão do usuário em 15/10/2026

O usuário definiu: **“Pausar o tempo pago e retomar o saldo após aprovar a correção”**. A indisponibilidade automática deve preservar o saldo de tempo pago. A retomada depende da aprovação da correção, com autorização atual do servidor e validação da URL. Não retomar pela simples resposta HTTP positiva, pelo envio da proposta ou pelo pagamento já realizado.

Essa decisão resolve o tratamento comercial bloqueante de D08. Não autoriza novo preço, reembolso automático ou alteração da retirada manual pelo administrador, cujo comportamento atual cancela destaques. Distinguir a origem da indisponibilidade para evitar recuperar uma retirada manual pelo fluxo automático.

## Revisão de reutilização

Reaproveitar o cliente HTTP protegido, worker/fila existentes, autorização por tenant, moderação e auditoria transacional. O classificador de URL usado na submissão não deve mudar incidentalmente: o acompanhamento periódico precisa distinguir falha transitória, bloqueio do provedor e evidência repetida de indisponibilidade.

Antes de alterar persistência, verificar contratos de capacidade, quotas, expiração, elegibilidade e o ledger financeiro de F01. A pausa precisa ter registro durável e não pode contabilizar tempo suspenso como consumo nem reativar promoções canceladas ou expiradas. Uma correção não pode publicar uma proposta antes da decisão nem reutilizar comprovação da URL anterior.

Estado: implementação concluída; fechamento S7 depende dos resultados finais e do CI registrados abaixo. O usuário determinou encerrar o trabalho após F07; nenhuma feature seguinte será iniciada.

## Contratos técnicos concretizados

Monitor desabilitado por padrão para rollout controlado (`AVAILABILITY_ENABLED=0`). Intervalo regular de 360 minutos, limiar de três falhas, backoff de 30/60 minutos antes de atingir o limiar e intervalo mínimo de 60 segundos entre checagens do mesmo host, globalmente entre tenants. Configuração validada: intervalo 5–10080 minutos, limiar 2–10, retry 5–360 minutos e host 1–3600 segundos. Não diminuir artificialmente esses intervalos em produção para executar testes.

200–299 significa acessível, sem prometer vaga. Timeout, erro de rede, 404/410 e 5xx contam como falha; uma ocorrência não retira o link. Demais respostas, incluindo 401/403/405/429, são inconclusivas e interrompem a sequência de falhas. Um resultado acessível após a retirada automática não recupera a publicação por si só. Probes protegidos recusados por segurança são inconclusivos, sem fazer conexão privada.

Retirada automática libera a vaga como o estado UNAVAILABLE atual. Aprovar a recuperação precisa adquirir novamente a vaga sob a mesma quota e autorização; se não houver vaga, retornar conflito e conservar proposta/saldo pausados até o dono liberar espaço. Não criar uma quinta publicação nem reativar uma conta suspensa. A retirada manual conserva seu fluxo separado.

Pausa financeira usa um journal por promoção com sequência, início, término e saldo em milissegundos. Ledger de F01 conserva valor e intervalo comprado, acrescido da sequência conhecida na compra; projeção calcula as janelas efetivamente servidas sem consumir o intervalo suspenso. Renovação posterior à retomada não recebe novamente as pausas anteriores. Promoção expirada ou cancelada não ganha crédito. Nenhum preço ou pedido pago será alterado.

Oito testes de domínio falharam inicialmente pela ausência dos novos módulos e passaram após implementá-los. Esse vermelho comprova a lacuna de implementação, ainda não substitui PG/worker/E2E. Persistência e integração foram verificadas posteriormente nos testes PG/HTTP/worker descritos abaixo.

Para entrega de aviso ao dono, reutilizar mailer e renderer existentes. A chave idempotente do provedor ajuda nas retentativas dentro de 24h, conforme [Resend](https://resend.com/changelog/idempotency-keys); persistência local e retry limitado continuam necessários e não equivalem a entrega exatamente uma vez fora dessa janela.

## Recuperação e moderação

Correção aceita um endereço substituto ou o convite atual, caso tenha voltado a funcionar. Não exigir rotação desnecessária de um convite válido após uma falha de rede prolongada. Ambos os casos exigem revalidação protegida e aprovação humana; reenviar o endereço atual não republica automaticamente. O formulário explicita essa possibilidade. Rejeitar conserva URL e saldo; aprovar mantém o histórico, retoma somente promoções PAUSED e revalida conta, quota, tenant, rede e URL elegível.

A baseline não possui modelo ou serviço de comprovação de propriedade de URL; F28 ainda é uma feature planejada. Portanto não há prova existente a apagar ou invalidar nesta entrega. A URL anterior fica vinculada à revisão e não serve como autorização para o novo destino; verificação cadastral do usuário é preservada. Ao implementar F28, a prova deverá estar vinculada à URL/revisão, sem reaproveitamento implícito após substituição. Essa divergência do cenário proposto F07-I01 foi registrada; não criar uma implementação fictícia de F28 para marcar um checkbox.

Revisões de URL usam fila própria no painel administrativo, pois o ModerationCase atual representa submissão/contestação e sua recusa pode republicar o estado anterior. Reusar esse efeito na indisponibilidade retomaria um destino inválido. As decisões atuais de F42 por WhatsApp seguem seu contrato; esta fila de correções não finge ser uma revisão de texto/submissão.

## Persistência e consistência

Migration aditiva `20261016110000_availability_paid_pause`: estado por link, concessão durável de probe, throttle global de host, revisão de URL, journal de pausas e sequência no investimento. FKs compostas protegem o tenant; índices suportam trabalho vencido e fila; constraints impedem dois journals abertos ou duas propostas pendentes para o mesmo recurso.

Probes carregam URL, versão e token de concessão. Reentrega, concessão expirada, revisão nova e retirada manual impedem aplicar resultado antigo. Propostas pendentes são excluídas da seleção do lote, para não bloquear os demais links. URL proposta permanece privada até aprovação. Decisão, retomada e auditoria ocorrem na mesma transação; falha de auditoria conserva proposta, saldo e URL originais. Atualização serializável preserva a quota na recuperação.

Pedidos confirmados durante a pausa, inclusive renovação iniciada antes da indisponibilidade, mantêm seu benefício e não geram ledger repetido. Nenhum pedido, preço ou total pago é alterado. Expirados e cancelados não são reativados; banimento também cancela PAUSED, preservando a regra de suspensão existente. F01 exclui janelas pausadas do custo, destaque diário e atribuição de cliques.

Aviso ao dono tem intenção durável no estado de disponibilidade, concessão de entrega, até cinco tentativas com backoff e chave idempotente. Envia apenas ao e-mail atual confirmado, usando mailer e HTML/texto existentes. Provedor ausente não é registrado como entrega realizada. Falhas geram log com código e ID, sem endereço do destinatário ou URL completa. Estado e orientação continuam acessíveis no painel mesmo quando o e-mail falha. Sem novo provedor ou biblioteca.

## Falhas encontradas e corrigidas

O primeiro E2E passou a jornada de saldo, mas o seletor de erro offline também capturou o anunciador de rota do Next. Foi restrito ao formulário sem relaxar a asserção; sete testes passaram depois. Uma rodada separada falhou na inicialização local da API no Windows antes de executar testes; log preservado e harness passou a registrar o encerramento de cada filho e limpar processos próprios na falha de prontidão.

As duas primeiras regressões completas aprovaram 65/66 testes e revelaram problemas reais no transporte compartilhado da submissão: callback de lookup incompatível com seleção automática de família do Node (`ERR_INVALID_IP_ADDRESS`) e preferência IPv6 diferente do cliente anterior, resultando em timeout na máquina local. A documentação [Node22 net.connect](https://nodejs.org/docs/latest-v22.x/api/net.html#socketconnectoptions-connectlistener) confirma o contrato de lookup e a seleção automática. A conexão passou a usar diretamente o IP validado, com SNI/Host originais, certificado verificado e preferência IPv4, mantendo a validação de todos os endereços retornados. Testes em vermelho precederam as correções; checagem real de leitura em `https://t.me/bolo` retornou 200 após a correção.

Os fixtures de submissão E2E agora usam o adapter externo determinístico também para `t.me`, somente fora de produção, como já ocorria para `example.com`. API/BFF/banco/worker continuam reais. Isso remove dependência do Telegram público, sem ocultar a falha de transporte: sua reprodução e regressões específicas estão preservadas. Probes de F07 usam o stub externo com respostas controladas; o estado interno não é fabricado por interceptação de API.

Transporte também ganhou limite de 1MiB durante o streaming, prazo absoluto por conexão e DNS limitado, sem duplicar cliente HTTP na submissão. Respostas 204/205 acessíveis deixam de gerar erro por corpo incompatível com Response. SSRF inclui IPs privados, não públicos, credenciais, DNS misto, redirect e pinning, preservando validação TLS.

## Migração, rollout e reversão

Banco descartável `f07_migration_proof`, criado da prova anterior à F07, preservou a projeção do link, campanha, pedido pago e investimento. EXPLAIN em 10.001 linhas sintéticas escolheu naturalmente o índice de trabalho vencido. Banco rejeitou segundo journal aberto. Nenhum dado de produção utilizado ou apagado.

Rollout futuro: aplicar schema; implantar API e worker compatíveis com PAUSED; conferir leitura e pipeline com monitor desligado; só então habilitar AVAILABILITY_ENABLED de forma controlada. Observar falhas de probe por host, retiradas, conflitos de decisão e tentativas de aviso. Não houve configuração no Coolify, deploy ou alteração da main.

Reversão operacional ensaiada no PG/worker: desligar o monitor mantém leitura, proposta e saldo pausados, sem nova rede ou alteração do estado. **Após existir PAUSED, não voltar ao Prisma/aplicação anterior à F07**, que desconhece o enum. Conservar o build compatível e desabilitar a entrada do monitor; eventual downgrade exige backport compatível ou migração compensatória específica, preservando saldo e histórico. Não executar DROP/reset nem converter pausados em expirados para facilitar rollback.

## Revisão visual

Reusar painel, controles, tokens e padrões de estado já validados em F01/F06; sem nova biblioteca ou design paralelo. Regra e transporte separados da apresentação em `features/availability`. Referências de fila/triagem da F06 continuam aplicáveis à decisão humana; a composição dominante é a aplicação existente. Não houve disponibilidade de Refero.

Chrome DevTools inspecionou as páginas reais autenticadas do dono e do admin em 1280×720 e 390×844. Conferiu labels, campos obrigatórios, foco azul de 3px, `noindex, nofollow`, formulário admin limitado a 680px e texto secundário rgb(92,107,127) sobre branco (5,43:1). Em 320px com texto a 200%, os retângulos de texto do título ficaram dentro do contêiner e não houve overflow da página. Revisão visual motivou quebra de palavras local, sem mexer na especificidade global. Isso não equivale a aparelho físico ou auditoria completa de acessibilidade.

Capturas do runner usam protocolo e datas fixos para fila e estado pausado. A jornada real usa estado persistido e é afirmada antes da captura de referência; não transformar resposta interna em fixture para produzir imagem. Fonte ampliada é teste de reflow/texto, não alegação de zoom nativo de navegador.

## Falhas finais diagnosticadas

Um fixture antigo de F42 usava UUID no título; sequências numéricas aleatórias eram identificadas pela regra existente de telefone, impedindo a edição proposta. O título foi substituído por texto determinístico com o nome do projeto; nenhuma regra de conteúdo ou assertion foi relaxada. Observação fora da F07: a UI de edição textual pode informar proposta registrada quando o backend a bloqueia; não foi ampliado o escopo para corrigir esse fluxo nesta entrega.

No último E2E, o worker criou LinkAvailability entre os INSERTs do fixture. A primeira extração deixou o journal condicional fora da transação e foi corrigida antes do resultado verde. A preparação de link, disponibilidade, pedido, promoção e journal agora é uma única transação, impedindo estado parcial observável. Isso corrige o teste e mantém o worker real. Outra interrupção ocorreu porque Docker Desktop estava desligado; os containers locais próprios foram reiniciados e as suítes repetidas. Logs dessas interrupções não são tratados como aprovação.

Rejeição de proposta preserva URL e saldo; repetição de decisão terminal retorna 409 (teste primeiro falhou com 404). Aprovação reusa assertCheckout, extraído como regra pura e reexportado pelo módulo anterior. Testes adicionais em vermelho cobriram mudança de categoria para restrição etária e configuração de rede durante o probe. A transação final revalida a elegibilidade por superfície e bloqueia a configuração de rede/categoria durante a decisão. Conflito conserva proposta e tempo pausados.

## Validação final local e rastreabilidade

Backend: lint e typecheck aprovados; **388 testes em 94 arquivos** e build aprovados. PostgreSQL/Redis reais: **92 testes em dez arquivos**, incluindo **20 casos F07**. Frontend: lint e typecheck aprovados; **169 testes em 48 arquivos** e build aprovado no setup E2E. A regressão Playwright completa passou **66 testes**, zero skips e zero retries, nos projetos desktop/mobile e setup real. O CI do commit permanece em fechamento. Não há retries automáticos ou skips novos.

Mapeamento: AC01/T01 e AC02/T02 — classificador e PG de falhas transitórias/403; AC03/T03 — host compartilhado entre dois tenants e concessões; AC04/T04 — HTTP real contra IPv4/IPv6 privados, credenciais, DNS/redirect/pinning e transporte limitado; AC05/T05 — PG de aprovação/rejeição, quota, elegibilidade atual, cancelamento/expiração, pagamento durante pausa, auditoria, corrida de URL e E01/E03. Componentes C01/C02 cobrem persistência, duplicação, erro e privacidade; E02 confirma API/DOM privados. Testes estão em availability-monitor.spec.ts, paid-time.spec.ts, safe-fetch.spec.ts, pinned-connect.spec.ts, link-availability.pg.spec.ts, url-correction-form.test.tsx e link-availability.spec.ts.

Evidências em evidencias/F07/2026-10-15: logs vermelhos selecionados, resultados verdes finais, prova de migração e capturas do runner. Traces com cookies permanecem locais e não são versionados. Comandos: backend npm run lint, npm run typecheck, npm test, npm run test:pg com PG_SPECS=1 e URLs locais, npm run build; frontend npm run lint, npm run typecheck, npm test, npm run test:e2e (inclui build), E2E_PORT_OFFSET=100 e E2E_RUN_ID=roadmap. As portas padrão de desenvolvimento foram preservadas.

## Limites e encerramento

Monitor desligado por padrão. Nenhuma mudança de produção, main, Coolify ou envio real de WhatsApp/e-mail. Browser mobile emulado e reflow com texto a 200%; aparelho físico e zoom nativo não ensaiados. A disponibilidade HTTP não comprova vaga. Rollback após PAUSED exige build compatível, conforme seção anterior.

Por solicitação posterior do usuário, encerrar após F07 e sua documentação. F02 e demais features não iniciadas.
