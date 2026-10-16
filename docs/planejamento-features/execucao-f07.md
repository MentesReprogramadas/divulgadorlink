# F07 — acompanhamento de disponibilidade

## D08 — decisão do usuário em 15/10/2026

O usuário definiu: **“Pausar o tempo pago e retomar o saldo após aprovar a correção”**. A indisponibilidade automática deve preservar o saldo de tempo pago. A retomada depende da aprovação da correção, com autorização atual do servidor e validação da URL. Não retomar pela simples resposta HTTP positiva, pelo envio da proposta ou pelo pagamento já realizado.

Essa decisão resolve o tratamento comercial bloqueante de D08. Não autoriza novo preço, reembolso automático ou alteração da retirada manual pelo administrador, cujo comportamento atual cancela destaques. Distinguir a origem da indisponibilidade para evitar recuperar uma retirada manual pelo fluxo automático.

## Revisão de reutilização em andamento

Reaproveitar o cliente HTTP protegido, worker/fila existentes, autorização por tenant, moderação e auditoria transacional. O classificador de URL usado na submissão não deve mudar incidentalmente: o acompanhamento periódico precisa distinguir falha transitória, bloqueio do provedor e evidência repetida de indisponibilidade.

Antes de alterar persistência, verificar contratos de capacidade, quotas, expiração, elegibilidade e o ledger financeiro de F01. A pausa precisa ter registro durável e não pode contabilizar tempo suspenso como consumo nem reativar promoções canceladas ou expiradas. Uma correção não pode publicar uma proposta antes da decisão nem reutilizar comprovação da URL anterior.

Estado: S0 em andamento. Nenhum comportamento de F07 implementado ou validado ainda. Limiar, intervalo, backoff, concorrência e estratégia de pausa estão em revisão técnica; serão registrados com testes antes da implementação.
