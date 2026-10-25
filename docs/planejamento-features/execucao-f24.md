# F24 — Descoberta de páginas

Execução iniciada em 21/10/2026 por autorização de continuar as features restantes. Branch existente `codex/roadmap-f37-testes`; alterações anteriores de CI e componentes preservadas. Sem novo commit, push ou deploy.

## Contrato e decisões D26

- Página pública em `/paginas`, acessível pelo cabeçalho e pela sidebar. Opt-in em **Minha página → Dados da página → Encontrar minha página**. Desativado por padrão.
- A projeção publicada, a conta ativa, os itens visíveis/disponíveis, o nicho público e as restrições de idade determinam elegibilidade. Nunca consultar nome ou descrição do rascunho para busca/apresentação.
- Nicho opcional, escolhido entre os nichos públicos do tenant. Não aproveitar nomes de grupos particulares como taxonomia pública.
- Ordem por ID, cursor exclusivo e lotes de 20 candidatos; a filtragem final pode produzir páginas menores ou vazias com próximo cursor. Repetir a consulta a partir do último candidato evita carregar todo o catálogo. Alternativa de ranking por popularidade/seguidores recusada por falta de evidência e risco de mudar métricas.
- Nenhuma venda de destaque de página foi criada. Backend informa `sponsored:false`; a apresentação identifica “Patrocinado” quando o contrato informar patrocínio. F24-T03 cobre essa condição no componente; não existe produto pago de perfis para simular em produção.
- Seguir acompanha a conta pessoal do visitante autenticado, mesmo enquanto edita um espaço compartilhado. A API client explicita `x-workspace-owner:self` para navegação/seguimento; a configuração de descoberta da página continua no espaço autorizado. Alternativa de gravar seguidores em nome do cliente foi recusada por misturar a identidade pública do visitante com a operação de edição da equipe. PUT/DELETE idempotentes. Desligar descoberta não apaga silenciosamente as escolhas dos seguidores: na consulta privada “Somente páginas que sigo”, um alvo indisponível vira um cartão sem nome, slug, foto, nicho ou descrição anteriores, com ação de deixar de seguir. Exclusão real do perfil remove relações por FK.
- Configuração exige `page.write`, versão otimista própria e lock do proprietário; não incrementa nem republica o rascunho. As demais permissões e o fluxo de moderação permanecem existentes.
- Sem analytics ou e-mails novos. As relações permanecem até deixar de seguir ou excluir a conta/página; sem lista pública de seguidores. Opt-in é auditado sem contato pessoal.

## Reuso e dados

`publicProfileProjection` mantém a única regra de renderização/elegibilidade. Reutilizados controller de perfis, BFF/CSRF, resolução de tenant, autorização global, `assertProfileOwner`, API client, Checkbox, Select, Field, Button, ErrorState, EmptyState e Skeleton. Novos componentes ficam em `features/profile-discovery`; `app` compõe a rota SSR. Não foram instaladas dependências.

Migração aditiva `20261021120000_profile_discovery`: configuração separada e relações de seguidores com FKs compostas, unicidade e índices por tenant/nicho. Sem backfill: páginas existentes continuam fora da descoberta. Testada em PostgreSQL descartável; não aplicada ao banco pessoal nem à produção nesta execução. Aplicar a migração antes de publicar o backend/frontend. Código usa SQL parametrizado, mantendo compatibilidade com o cliente Prisma gerado existente; schema foi validado.

Design: composição de cards de identidade com filtros locais; checkbox desmarcado para opt-in e à esquerda do rótulo, conforme [GOV.UK Checkboxes](https://design-system.service.gov.uk/components/checkboxes/). A inspeção real revelou limite global de largura nos forms; corrigido apenas no CSS Module desta feature. Refero indisponível; não foi adquirida assinatura. Ícones de descoberta/seguir/deixar de seguir possuem desenhos próprios; abrir, buscar e salvar reutilizam o mesmo significado existente.

## Evidências e estado

| Prova | Resultado executado |
| --- | --- |
| `npx prisma validate` | Aprovado |
| Backend `profile-discovery.spec.ts` | 2 unitários aprovados |
| Backend HTTP/PG `profile-discovery.pg.spec.ts` | 5 testes aprovados em PostgreSQL real descartável; repetição após extensão da lista privada em andamento |
| Frontend discovery + editor + navegação | 25 testes aprovados |
| E2E desktop/mobile | 7 aprovados, incluindo setup; habilitar, buscar, seguir, persistir após reload, opt-out, cartão indisponível, deixar de seguir, rascunho sentinela, isolamento, 401, teclado, rede e 320px |
| Axe | Sem violações reportadas no `main` dos cenários E01 desktop/mobile |
| Lint/typecheck frontend/backend | Aprovados após correções locais |
| Build backend/frontend | Aprovados; refinamento final e consolidação registrados em execucao-f36.md |

Os primeiros testes detectaram uma fixture inválida de despublicação (a FK/check existente foi preservada), expectativas antigas da navegação e uma asserção E2E abrangente que incluía o anúncio interno do Next. Corrigidos os testes, sem remover os contratos protegidos. Unitários e componentes foram desenvolvidos junto da implementação; não há evidência de fase vermelha prévia da regra de domínio.

E2E executado em cópia local isolada em `%TEMP%/temlink-roadmap-20261021`, usando dependências já instaladas, portas com offset 120 e containers próprios. Outra execução Playwright estava ativa no projeto original; seus processos, sessões e containers não foram interrompidos.

S0–S6: implementação e validação local concluídas, incluindo refinamento e capturas. S7: CI remoto, liberação e observação em produção **pendentes**. Emulação mobile não valida aparelho físico; não há certificação integral de acessibilidade ou aumento de conversão comprovado.

## Operação e reversão

Para testar: criar/publicar uma página, ativar descoberta nos dados, abrir `/paginas` em outra conta, buscar e seguir. Desativar no proprietário, consultar somente seguidas e remover o seguimento.

Para reverter a UI, retirar entrada de navegação e composição nova, preservando alterações anteriores do usuário. Desativar opt-ins antes de remover as rotas; manter tabelas e dados. Não executar reset, drop ou migration destrutiva para desfazer a entrega. Rollback remoto não foi executado.

## Fechamento do lote — 21/10/2026

Lint/typecheck e builds dos dois pacotes: exit 0 (build Next em cópia isolada para preservar servidores de outras tarefas). Consolidação: 32 testes backend/domínio, 69 PostgreSQL e 136 frontend aprovados. Playwright final F36/F20/F19/F31: 25 aprovados, zero skips/flaky/falhas; resultados anteriores específicos desta feature permanecem acima. Atualização incremental do grafo e inspeção das capturas concluídas. Detalhes e JSON: [execução F36](execucao-f36.md); [como testar/configurar](testar-lote-2026-10-21.md). F40/F41 não iniciadas. S7/CI/deploy continuam pendentes; nenhuma migração no banco pessoal e nenhum novo commit/push.

Atualização posterior autorizada em 21/10/2026: migrations do lote aplicadas também no PostgreSQL local `localhost:5437/divulgador`, com backup fora do repositório, status atualizado e Prisma Client gerado. Commit/push deste lote autorizados na branch `codex/roadmap-f37-testes`; detalhes em [execução F36](execucao-f36.md). Produção não alterada.


## Revisão de fluxo posterior — 21/10/2026

F24 revalidada na revisão explícita das sete áreas, incluindo navegação por contextos, hierarquia, componentes da casa, busca/filtros e permissões. Resultados anteriores permanecem históricos. Mudanças, testes reais e evidências em [revisão consolidada](../frontend-profissional/revisao-fluxos-2026-10-21.md). Esta revisão está na árvore local, sem novo commit/push/deploy.
