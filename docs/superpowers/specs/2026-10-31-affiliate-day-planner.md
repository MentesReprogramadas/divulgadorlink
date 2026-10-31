# Lotes diários de ofertas

Pedido autorizado: implementar e publicar texto curto, planejamento automático e seleção manual de ofertas, revisão mobile e histórico visível na lista. A autorização de execução dispensa uma nova rodada de aprovação de design; a aprovação de cada lote continua obrigatória no produto.

Fluxo: escolher dia, período (Brasília), quantidade e geração automática ou produtos selecionados. Construir rascunho no servidor, com fotos, preço atualizado, links e mensagens exatas. Rever a sequência numa lista compacta; remover itens ou cancelar o rascunho. Aceitar agenda o lote. Mostrar volume por grupo, volume total, intervalo e horários antes do aceite. Permitir cancelar pendências depois.

Escolha: reaproveitar fila e distribuição atuais; persistir lote e itens no PostgreSQL, com lease e retomada pelo worker. Evitar fila paralela ou temporizadores no navegador. Criar somente após confirmação, sem envio imediato nos testes. Até 24 ofertas por lote e 30 dias de antecedência. Padrão configurável: 12 ofertas entre 09h e 21h, sem alegar frequência comprovada de concorrentes. Referência de interação: Buffer, fila por horários e publicação em múltiplos canais (https://support.buffer.com/en-us/articles/setting-up-your-timezones-and-posting-schedules-P4iSag90Fl). Não há evidência de uma cadência universal para grupos de ofertas.

IA: uma chamada com fatos públicos dos candidatos e contagens, nunca credenciais/dados dos participantes. Ordenação validada, descontos primeiro, desempate por menor repetição e preferência da IA. Sem IA, executar mesma regra determinística e informar a origem. Produtos sem desconto completam a quantidade. Sem repetição do mesmo produto no lote; bloqueio de distribuições concorrentes.

Confiabilidade: rascunho expira; aceite idempotente e escopado a tenant/ator; grupos e credenciais conferidos. No horário, revalidar preço, desconto e anúncio antes de criar o broadcast com a mensagem aprovada. Mudanças bloqueiam o item para revisão. Lease recuperável; chave estável por item impede repetição após falha. Cancelamento preserva entregas concluídas/incertas e cancela pendências. O distribuidor mantém seus limites por conexão; horário representa entrada na fila, sem promessa de simultaneidade exata.

Lista: produto enviado permanece, com contador de distribuições que tiveram entrega confirmada, separado de pendências e aprovação. Seleção manual por checkbox, barra flutuante acessível, revisão com imagem pequena e mensagem expandível. Histórico permanece mesmo quando cache da busca expira. Contagens alimentam seleção automática.

Texto aprovado: título do produto, De riscado quando disponível, preço com fogo, percentual OFF e economia, Compre aqui e link. Omitir chamada inicial e rodapé. Preservar notas manuais explícitas.

Validação: domínio (cadência, desconto, repetição, data e copy), PostgreSQL (isolamento, idempotência, leases, aceite, preço alterado, cancelamento), HTTP (autorização e schema), UI (seleção, revisão, estados), E2E e inspeção mobile/desktop. Lint, typecheck, testes e builds dos dois pacotes; CI integral antes do deploy.
