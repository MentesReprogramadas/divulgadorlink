# Entrada em grupos: dez segundos

O mínimo de 120 segundos estava no Zod, formulário, default Prisma e CHECK PostgreSQL. Timer do worker e próximo processamento de grupo ativo também usavam 30 segundos. Agora o mínimo/padrão é dez segundos e o polling ativo é dois segundos. Permanecem leases, limites por lote, guards de tenant/estado, criptografia, confirmação por participante e bloqueio de retry UNCERTAIN. Autenticação, capacidade e permissões não foram alteradas.

A migration `20261031180000_affiliate_admission_ten_seconds` altera CHECK/default e converte somente o valor exato 120 para 10, inclusive defaults JSON válidos da conta. Admissions PENDING das segmentações convertidas recebem firstSeenAt + 10 segundos; estados APPROVING/UNCERTAIN/APPROVED não mudam. Esperas maiores personalizadas são preservadas. Configuração JSON corrompida permanece bloqueada. Grupos elegíveis com dez segundos têm seu próximo processamento acordado.

## Verificações executadas

- Todas as migrations aplicadas em PostgreSQL local descartável `affiliate_admission_regression_20261031`; banco criado e removido no container existente, sem tocar outros bancos. Group-policy e defaults: 19 testes passaram, cobrindo espera, polling, idempotência, concorrência, incerteza, cancelamento/reentrada, tenant, auditoria e conversão de dados legados/customizados.
- HTTP group-policy: um teste passou; outros 22 do arquivo foram excluídos pelo filtro. Inclui anônimo, mínimo inválido, payload estrito e persistência.
- Adapter Evolution: três testes passaram, incluindo LID, capacidade explícita e confirmação exata por participante.
- Formulário: três testes passaram; reprodução falhou com o mínimo antigo antes da correção. Aceita 10 e rejeita 9.
- Playwright Test pets-admin-settings: dois testes passaram, desktop 1440×900 e mobile 390×844. Build Next concluído pelo servidor isolado; validação nativa, persistência stub, foco e axe no diálogo sem violações detectadas. Capturas geradas e inspecionadas em `output/admission-ten-seconds/browser/`.
- Backend typecheck, lint e build passaram; frontend typecheck e lint passaram. Typecheck E2E repetido após editar o spec passou. Prisma Client regenerado para o novo default.

Nenhuma mensagem ou aprovação real. Evidência PostgreSQL em `output/admission-ten-seconds/pg.log`, ignorado pelo Git. Servidores E2E próprios finalizados.

## Runtime e limites

Consulta somente leitura ao Coolify encontrou Evolution saudável em `https://evolution.temlinkaqui.com`, imagem `temlink/evolution-api:2.3.7-admission-ea6a06fe84ca`. O código aprova pelos endpoints autenticados Evolution. Não existe ponte Chrome de aprovação neste repositório; affiliate-bridge atende ao catálogo Mercado Livre. Não controlei Chrome pessoal nem executei aprovação real para comprovar runtime remoto.

Dez segundos contam da primeira observação persistida: o contrato retorna JIDs, sem timestamp original. Polling/rede/ciclo acrescentam latência; em condições leves, aproximadamente 10–14 segundos, sem garantia exata. Limites de dez grupos/vinte aprovações por lote podem aumentar a espera. O polling passa de 30 para dois segundos; acompanhar carga do provedor. Backoff de cinco minutos em falhas e bloqueio de retry UNCERTAIN permanecem. Sem auditoria completa de zoom/acessibilidade ou teste de produção.

## Entrega e reversão

Alterados schema e nova migration, domínio/use-case group-policy, intervalo do worker, testes PG de política/defaults/HTTP, formulário/testes, E2E pets-admin-settings e README Evolution. Sem dependências novas. Nenhuma alteração no planejador, AI, discovery ou day-plans.

Aplicar migration antes do novo worker pela esteira existente. Reversão de código exige restaurar a política/default desejados em banco; não apagar migration aplicada. Restaurar valores anteriores exige backup ou seleção explícita das contas, pois valores inicialmente iguais não podem ser distinguidos após a conversão. Sem commit, push ou deploy por esta subtarefa. Graphify consultado inicialmente; reindexação final integrada fica com a tarefa principal para evitar concorrência.

## Correção adicional de ATTENTION

Um participante UNCERTAIN mantinha o grupo em ATTENTION com backoff de cinco minutos, atrasando novos pedidos. ATTENTION agora mantém polling de dois segundos, enquanto a consulta de elegíveis continua excluindo UNCERTAIN. Regressão PostgreSQL reproduziu a falha antes do ajuste e confirmou novo participante aprovado após dez segundos sem repetir o incerto. Backoff de conexão/provider/unsupported continua em cinco minutos.
