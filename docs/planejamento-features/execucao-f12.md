# Execução F12 Link permanente para convites

Estado: EM PREPARAÇÃO. Em 16/10/2026 o usuário autorizou continuar as features sem a parada anterior ao final de cada feature. A execução permanece em `codex/roadmap-features`, com commits e push autorizados pelo histórico da conversa. Main e deploy não fazem parte desta autorização.

## S0 Contrato e decisões

Reutilização examinada: redirecionamento de catálogo `@Links/go.ts`, BFF `/go/[linkId]`, canonicalização de URLs, `safe-fetch`, `probeAvailability`, F07 de correção de disponibilidade, validação automática da F09, autorização de publicação e contexto de tenant. A rota de catálogo mantém suas métricas e contratos. Um convite permanente precisa de identidade e histórico próprios, pois não equivale a uma nova entrada do catálogo nem a uma promoção.

Decisões pendentes de resposta do usuário:

- Liberação de cada destino: automática após todas as validações ou revisão administrativa. A decisão D10 autorizou automação para URLs de perfil; não foi silenciosamente ampliada para uma mudança de destino compartilhado.
- Retenção de destinos e versões de perfil: sugeridos até 50 versões por 180 dias, preservando a publicação atual. Alternativa apresentada: até 100 versões por um ano. Nenhuma dessas alternativas foi aplicada ao banco.

Proposta técnica D14: respostas de resolução com `Cache-Control: private, no-store`, redirecionamento temporário e nova consulta da revisão aprovada a cada acesso; endereço gerado pelo servidor, não alterável na entrada de atualização; destino inválido ou falha externa preservam a revisão pública anterior. Recuperar um destino histórico deve passar por uma nova validação. A retenção continua pendente; S0 não está concluída.

## Preparação de validação

Foi criado o contrato puro de entrada `backend/src/domain/redirects/redirect-input.ts`, sem registrar rotas ou alterar o schema. Exige HTTPS, ausência de credenciais e portas especiais, rótulo de 1–100 caracteres, URL de até 2048 caracteres, UUID de reenvio e revisão esperada inteira. O identificador público não é aceito como campo de atualização. Esses limites são de entrada/engenharia, não quotas de plano.

`backend/src/domain/redirects/redirect-input.spec.ts` contém quatro testes preparatórios. Primeiro houve falha de import por ausência do módulo; isso não foi aceito como prova de comportamento. Com o contrato permissivo provisório, os quatro testes falharam nas asserções esperadas; após implementar a validação, os quatro passaram. Saídas em [RED](evidencias/F12/2026-10-16/domain-red.log) e [GREEN](evidencias/F12/2026-10-16/domain-green.log).

O contrato sintático não prova DNS seguro, moderação, disponibilidade, isolamento, persistência ou navegação. Essas verificações permanecem pendentes para as camadas de integração e E2E. Nenhum AC da F12 foi marcado como aprovado; S1 não foi concluída apenas por estes quatro testes.

A preparação inclui `backend/src/use-cases/@Redirects/validate-destination.ts`: compõe `assertPublicHttps`, `canonicalUrl` e a porta `UrlProbe` já usada pela F07. A validação de transporte exige resposta terminal 2xx; estado nulo ou exceção da porta produz erro recuperável 503 sem detalhes do provedor, e URL recusada/indisponível produz 422. Aprovação de conteúdo permanece uma etapa separada obrigatória, ainda não implementada. Três testes adicionais cobrem destinos privados incluindo IPv4 mapeado em IPv6, nenhuma chamada de rede para URLs proibidas, canonicalização, falha externa e resposta indisponível. Os sete testes preparatórios passaram; ver [validação GREEN](evidencias/F12/2026-10-16/validation-green.log). Não houve execução PG/E2E da F12 nesta preparação.

## Próximas etapas

Fechar as decisões pendentes, reconciliar a spec e então implementar persistência, validação de cada destino, resolução pública, painel, histórico e métricas por revisão/período. Executar os testes unitários, componentes, HTTP/PostgreSQL e Playwright, revisão real desktop/mobile e os checks completos antes de concluir a feature e avançar no roadmap.

## Efeitos e reversão

Até este registro, nenhum endpoint foi registrado, nenhuma migration foi criada/aplicada e nenhuma configuração de produção foi alterada. Os arquivos preparatórios novos podem ser removidos sem afetar a funcionalidade existente. Os arquivos locais preexistentes continuam preservados.

## Checks do lote preparatório

Backend: lint, typecheck, suíte completa com **431 testes aprovados** e build, todos com exit code 0. Logs `backend-lint.log`, `backend-typecheck.log`, `backend-unit.log` e `backend-build.log` na pasta de evidências desta execução. Sem alteração de frontend; PG, E2E e CI da F12 ainda não executados.

## Regressão de foco encontrada durante a preparação

O commit preparatório `f9a611f` disparou o [CI 38963209066](https://github.com/MentesReprogramadas/divulgadorlink/actions/runs/38963209066). Verify, web e images passaram. O E2E teve 91 sucessos e uma falha em F04-E03 mobile: a confirmação de criação de coleção estava visível, mas não recebeu foco. A F12 ainda não registra endpoints ou páginas e não é exercitada por essa jornada.

A investigação verificou o código de favoritos e a captura do CI. `requestAnimationFrame` não assegura que o commit do React já inseriu o texto de confirmação; o CSS oculta `.status:empty`. Um novo teste reproduziu a tentativa de foco com texto vazio. A correção em `FavoritesScreen` usa `useLayoutEffect` dependente da confirmação, focando depois da atualização do DOM. O teste de regressão passou sem remover a asserção de foco do Playwright ou aumentar timeouts. Frontend lint, typecheck, suíte completa com 197 testes e build passaram. A regressão completa Playwright está em execução local; o fechamento do CI permanece pendente. Evidências na mesma pasta da F12, com identificação explícita de que a correção pertence à F04.
