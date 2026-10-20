# F33 — Coleções públicas compartilháveis

20/10/2026. Branch codex/roadmap-f37-testes; implementação após F32, sem push/deploy. Decisão D35 registrada com alternativas.

## Jornada e contrato

Painel → Favoritos → Coleções → abrir coleção → Publicar coleção. O modal pede título, descrição, nome público do curador, endereço permanente e indicação 18+. Publicar seleção só informa sucesso após persistência; erro mantém os campos. Configurar publicação permite republicar ou Tornar privada. Coleção nasce privada. /colecoes/slug usa LinkRow, EmptyState, cabeçalho, idade e consentimento existentes, sem outra identidade visual.

POST /me/collections/:id/publish aceita metadados e expectedVersion; PATCH /visibility aceita somente PRIVATE e versão; GET /collections/:slug é público. Configuração granular favorites continua protegida no servidor e UI, inclusive colaboradores; auditoria registra ator real. Conta ativa e e-mail confirmado são exigidos ao publicar. A porta de moderação, blocklist e limiar existentes validam texto público; falta de provedor, configuração ou certeza impede publicação, conservando a entrada para correção. Não criar IDs artificiais PROFILE/REDIRECT ou uma fila humana não prevista; links mantêm a moderação humana existente.

Snapshot contém metadados, ordem e IDs privados dos favoritos, nunca retornados ao público. Adições/renomeações privadas exigem republicação; desfavoritar/remover item retira imediatamente da projeção. Cada leitura confere estado do link, dono, nicho, rede e tenant. Indisponíveis são omitidos sem contagem ou destino. Curador informado explicitamente; propriedade original permanece intacta, com papéis Publicado pelo curador / por outro anunciante / pela plataforma, sem nome ou e-mail privado. Restrição de idade cobre a coleção inteira antes de retornar metadados.

## Migração e segurança

Migration expansiva 20261020100000_public_collections, campos PRIVATE/nullable e constraint de publicação válida, índice único tenant/slug. Reserva separada usa chave interna aleatória; excluir/recriar coleção com o mesmo ID externo não toma a URL. Reserva não contém nome/e-mail. Dados antigos continuam privados. Alterações serializadas pelo dono; versão revalidada após análise externa; publicação, reserva e auditoria atômicas. Cache private, no-store em ambas as superfícies. Leitura pública independe do workspace selecionado.

## Critérios e evidências

| AC | Oráculo |
| --- | --- |
| AC01/T01 | U/PG/E01: privada por padrão; publicação voluntária; conflito de versão sem duplicar revisão |
| AC02/T02 | PG/C02/E01: curador e anunciante distintos; propriedade e dados privados não transferidos |
| AC03/T03 | domínio/PG/E03: moderação do texto, status/idade/tenant/conta; UI e payload não vazam conteúdo restrito |
| AC04/T04 | PG/E02: rascunho e favoritos/IDs privados fora do DTO/DOM; anônimo/outro dono não leem operação privada |
| AC05/T05 | PG/E01: indisponibilidade, banimento e remoção retiram item na leitura |
| AC06/T06 | PG/E01: tornar privada revoga GET público com 404, UI pública mostra Não encontrado |

Backend: domínio 3/3, PostgreSQL real 15/15 (F33 cinco + regressão F04 dez), lint/typecheck/build aprovados. Frontend completo 453/453, lint/typecheck aprovados. E2E final 15/15 (F33 e regressão favoritos nos dois viewports + setup), build de produção pelo harness. E03 inclui falha real de rede, recuperação, teclado e reflow 320px/200%; Axe no público. Inspeção direta das capturas desktop/mobile confirmou hierarquia, card compartilhado e distinção de papéis. Migration aplicada em PG descartável contendo dados anteriores.

Primeiro red de domínio: duas regras ausentes e uma falha de transform que lançava exceção em safeParse; corrigido o contrato de validação. Primeira rodada frontend revelou texto corrompido por leitura Windows sem encoding e label com dois filhos; corrigidos para UTF-8 explícito e Field com hint. Primeiro E2E 13/15: o teste supunha status HTTP 404 no documento Next já transmitido. A API retorna 404; a navegação em streaming pode responder 200 e renderizar NotFound/noindex. Teste reconciliado para exigir 404 na API e ausência de conteúdo + NotFound no documento, sem chamar 200 de autorização. Relatório inicial/traces preservados.

## Operação e reversão

Nenhuma env ou dependência nova; usar provedor de moderação já configurado. Sem nova coleta de analytics: seleção abre o detalhe original, preservando métricas/consentimento existentes; relatório específico de visitas da coleção não foi criado. Índice é para lookup tenant/slug, sem alegação de ganho de desempenho em fixture pequena. Reverter entradas de publicação/rota antes do código, manter campos e reservas; não remover dados nem liberar nomes no downgrade. Rollout exige migration antes do leitor.

S0–S6 locais; S7/CI/liberação remota pendentes. Próxima e última desta autorização: F10.

Commit de implementação: e2d5b8a68dcb758dd09219cabecc3bfa831b4702.

Revisão de fechamento da F10: o negativo de FK passou a exigir P2003 com favorito realmente pertencente a outro tenant, sem depender de colisão de chave primária; F33 cinco PG e seis jornadas E2E desktop/mobile passaram novamente. Skeleton público usa o card orgânico sem ações privadas/contador, com CSS Module. Provas e hash do delta vinculados à execução F10.
