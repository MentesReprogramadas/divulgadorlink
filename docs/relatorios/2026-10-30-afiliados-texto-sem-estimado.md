# Mensagem de oferta sem o rótulo “estimado” — 30/10/2026

Por pedido explícito do usuário, o compositor compartilhado da mensagem passa a usar `De:` e `Economize`, inclusive para a referência calculada da Shopee. Exemplo testado: referência de R$ 38,90, preço de R$ 31,12 e economia de R$ 7,78, com 20% OFF. O teste exige ausência de `estimad` na mensagem.

São duas alterações de texto no compositor. Fórmula, valores, percentual original, sinalização interna da origem, campos de banco, validação da assinatura, isolamento de tenant, autorização, vencimento e confirmação de envio não foram alterados. Os rótulos administrativos de origem da referência ficam fora deste pedido sobre o texto da mensagem. Mensagens já aprovadas não são reescritas.

Verificações locais: regressão reproduzida antes da alteração; backend com lint, typecheck, build e 19 testes focados aprovados; 11 testes de prévia e typecheck de frontend/E2E aprovados. Fixtures de integração e navegador atualizadas para o novo texto. A CI integral será seguida de publicação e conferência das rotas reais, sem chamar envio.

Reversão: reverter o commit desta alteração de texto. Sem migração ou dependência nova. A referência continua sendo calculada a partir da taxa inteira fornecida pela Shopee; somente a redação da mensagem mudou.
