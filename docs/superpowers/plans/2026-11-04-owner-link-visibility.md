# Ocultar e desocultar link próprio

Pedido autorizado: adicionar Ocultar/Desocultar em Meus links, com Ocultar vermelho, e publicar pelo CI existente.

## Contrato

`Link.ownerHidden` é uma flag persistida com default false, independente da moderação e disponibilidade. `PATCH /api/v1/links/:id/visibility` recebe `{hidden: boolean}`. Somente o dono autenticado, verificado e ativo, no mesmo tenant, pode alterar a visibilidade. Preservar suporte somente leitura, CSRF, auditoria e proteção contra corridas de suspensão.

Ocultar remove o link das superfícies públicas, anexos, saídas, sitemap e novas compras de destaque. Desocultar não muda moderação: um link rejeitado continua rejeitado. A ação não libera vaga, pausa campanhas, cancela compras ou altera prazos pagos. A interface informa que os prazos continuam contando.

## Execução concluída

- Backend: migração aditiva, autorização transacional, DTO privado, guardas públicas e testes de isolamento/reversão.
- Frontend: botões no card, carregamento/erro, filtro Ocultos, cache protegido contra respostas antigas e título h2 acessível.
- Revisão independente das superfícies, cache e autorização sem bloqueios.
- Validação local isolada, sem pagamento ou alteração de dados em produção.

## Evidências locais

- Frontend: lint, typecheck e build passaram; suíte completa com 1.086 testes passou. Após os ajustes finais de acessibilidade, 25 testes afetados passaram novamente.
- Backend: lint, typecheck e build passaram; 1.111 testes passaram e um teste existente ficou ignorado.
- PostgreSQL: 18 testes de visibilidade e ofertas passaram em banco descartável. Migração aditiva aplicada sobre o histórico existente, default false.
- Playwright: quatro casos passaram (ocultar/restaurar e painel W01 em desktop/mobile), incluindo persistência após reload, indisponibilidade pública sem título/URL, teclado, Axe, largura 320px e preservação exata de vaga, status e prazo pago.
- Agent Browser: inspeção independente do card, clique Ocultar/Desocultar e capturas reais em 390px/1440px; sessão encerrada. Capturas locais em output/owner-hide, sem credenciais.
- Graphify: atualização incremental AST local, sem envio de código ou uso de LLM.

## Publicação e reversão

Commit/push para main e deploy autorizados pelo usuário, sujeitos ao pipeline existente. A confirmação de publicação depende do CI e do deploy do mesmo commit. Reversão: reverter o commit; a coluna aditiva pode permanecer sem excluir dados. Não foi realizada compra real. Ocultar não apaga cópias já obtidas por terceiros.
