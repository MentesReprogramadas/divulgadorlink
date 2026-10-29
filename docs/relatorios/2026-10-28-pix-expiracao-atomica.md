# Atomicidade da expiração Pix

Durante a validação ampla da integração de afiliados, 837 testes backend passaram e a prova de expiração Pix falhou com reserva ainda PENDING_PAYMENT. A repetição isolada confirmou a falha. Investigação somente de leitura e `git show HEAD` confirmaram que o comportamento já existia antes desta implementação.

## Causa e correção

`PrismaCheckoutStore.saveOrder` confirmava o status terminal em uma transação e liberava a reserva depois, em outra operação. A prova podia observar EXPIRED antes de RELEASED e encerrar o worker. Uma interrupção real nesse intervalo também poderia deixar a reserva pendente; a repetição de um pedido já expirado não a repararia.

O mesmo SQL de liberação passou para a transação que salva o pedido, nos mesmos quatro estados: EXPIRED, PAID_LATE, REFUNDED e REFUND_FAILED. Valores, elegibilidade, preços, estados e demais regras comerciais foram preservados. As provas Pix e seus limites/asserts permaneceram inalterados.

## Verificação

- Quatro regressões PostgreSQL demonstraram falha no código anterior: a liberação dentro do cliente transacional é forçada a falhar e pedido/reserva precisam reverter juntos. Depois, a execução normal valida o mesmo commit para cada estado terminal.
- Checkout PostgreSQL completo: 16 testes passaram. Pagamentos/recuperação: 14 testes passaram. Lint, typecheck e build aprovados.
- Revisão independente dos dois arquivos não encontrou P1/P2 pendentes. Repetição ampla final: **838 testes em182 arquivos passaram**, incluindo as duas provas Pix originais. Nenhuma asserção ou prazo dessas provas foi alterado.

## Limites

Somente `backend/src/use-cases/@Promotions/checkout-prisma.ts` e `backend/src/http/checkout.pg.spec.ts` mudaram. Não houve cobrança real, alteração de produção nem reparo automático de reservas históricas. Outras operações existentes de payments/order_events continuam fora dessa transação e não foram redesenhadas. Não remover a liberação interna sem preservar sua atomicidade.
