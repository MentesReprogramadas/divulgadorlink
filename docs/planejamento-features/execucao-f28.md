# F28 — Comprovação do domínio do destino

20/10/2026. Implementação local na branch existente codex/roadmap-f37-testes, após checkpoint 0d0a32b. Sem push/deploy. F39 corrigida para NÃO INICIADA: não havia implementação ou prova de execução, apenas uma marcação isolada no índice.

## Contrato e reuso

Convites → abrir endereço → Controle do domínio → Comprovar domínio. O modal explica criar/publicar/verificar arquivo HTTPS. Prova vinculada ao tenant, titular, destino e revisão F12. Reutiliza BFF, sessão/CSRF, permissões invitations, RedirectRequest, safeFetch com DNS fixado e limites, AuditLog, Badge, Field, OverlayDialog e skeleton. Novo OwnershipPanel coordena somente esta jornada. Projeção pública allowlist e página SSR /verificacao/:id, sem desafio, hash, IDs privados ou cookies de autenticação encaminhados ao endpoint público (somente age).

D30 e alternativas em decisoes.md. Arquivo em /.well-known/temlinkaqui-verification.txt, desafio aleatório de 32 bytes por 30 minutos, hash SHA256 persistido, no máximo cinco criações por hora/endereço. Comprovação por 30 dias; renovar cria outro desafio. Retenção 180 dias reaproveita purgeRedirectHistory. Arquivo sem redirects: não aceitar prova servida por outro domínio. Redes hospedadas não recebem método fictício; e-mail confirmado não comprova comunidade. Selo confirma somente controle do domínio, sem endosso de identidade, segurança ou qualidade.

Referência de procedimento: [Google Site Verification](https://developers.google.com/site-verification/v1/getting_started), fundamento de arquivo com token e conferência antes do selo; não integra Google nem copia sua identidade visual. A composição mantém os padrões do painel existentes. Refero indisponível conforme ferramentas.md.

## Persistência e segurança

Migration expansiva ownership_challenges, FK composta handle/tenant/owner, hash restrito, datas coerentes e evidência dependente de consumo. Sem backfill ou alteração de registros antigos. Trigger BEFORE UPDATE do handle revoga desafios/evidências em mudança de revisão, titular ou desativação, inclusive aprovação humana por outro fluxo. Projeção ainda confere esses vínculos e validade como segunda proteção. Verificação externa fora da transação; reconferência de destino/relógio, consumo condicional e AuditLog dentro da mesma transação impedem duas verificações concorrentes. Rejeição de conteúdo preserva desafio para correção. Revogação explícita exige confirmação.

## Aceitação executada

| Critério | Evidência |
| --- | --- |
| AC01/T01 | Conta confirmada sem selo; redes sem método; público lê escopo domínio; PG, domínio e E01/E02 |
| AC02/T02 | Desafio 30min, validade 30d, revalidação e expiração; PG/U/E02 |
| AC03/T03 | Troca de URL/revisão/titular e revogação invalidam; trigger PG e E01/E03 |
| AC04/T04 | Somente hash, uma consumação concorrente, auditoria, limite e retenção; PG e E02 |

Backend: 600 casos passaram na rodada geral, dois testes Pix falharam por schema desatualizado no banco padrão do teste; ambos repetidos e aprovados no PG/Redis descartável explícito. Portanto 602 casos aprovados considerando a repetição dos dois afetados, sem fingir uma rodada única verde. Frontend completo 438/438; domínio/adapter novos fazem parte da rodada backend. PostgreSQL inicial ownership+redirects 20/20; ampliação ownership final 7/7, incluindo colaborador e FK/titular. Playwright final 7/7 (desktop/mobile), mais build de produção do harness. Lint/typecheck de ambos e build backend aprovados. Query plan registrado: tabela pequena usa seq scan; índices alinhados à consulta por tenant/handle e retenção, sem alegação de ganho de desempenho.

Logs em output/f28-*.log; relatório output/f28-playwright-final.json; capturas e hashes em docs/frontend-profissional/evidencias/f28-2026-10-20. Inspeção direta: modal desktop e estado verificado mobile. Corrigido artefato de captura fullPage com backdrop nativo: captura final do diálogo usa viewport. Teclado Enter, erro recuperável preservando token, 320px/200%, escopo público Axe e ausência de token no HTML foram verificados. Não certifica acessibilidade global nem aparelho físico.

S1: testes negativos exercitados; a execução vermelha anterior à implementação não foi preservada, portanto não é declarada como executada. Desvio de processo registrado, sem inventar evidência retrospectiva. S7/CI e liberação remota permanecem em revisão.

## Operação e reversão

Sem env nova obrigatória; adapter usa HTTPS público e isolamento existente. Stub de arquivo restrito a NODE_ENV=dev, host example.com e origem localhost, somente no harness. Nenhum envio ou cobrança real. Migrations precisam ser aplicadas no ambiente autorizado. Para reverter, retirar endpoints/painel novos, preservando tabela/evidências para auditoria; não resetar alterações locais. Não aplicar migration destrutiva automaticamente. A infraestrutura descartável é encerrada no fechamento desta sequência.

Próxima F29, conforme autorização até F10; F39 permanece fora da sequência.
