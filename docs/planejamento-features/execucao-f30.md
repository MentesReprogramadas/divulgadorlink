# F30 — Integrações e avisos automáticos

Implementação local em 21/10/2026, por autorização de continuar o roadmap. Sem novo commit, push, deploy ou envio a sistemas externos reais. Frontend em **Painel → Integrações e avisos**; destinos configurados somente pelo responsável autorizado.

## Contratos, reuso e decisões

- Eventos `contact.received`, `link.approved` e `campaign.ended`. O último significa arquivar uma campanha publicada da F15; campanhas ainda não têm data de encerramento própria. Não inventar agendamento ou confundir campanha com expiração de destaque pago.
- Reutilizados os registros duráveis de contato, `MODERATION_EMAIL` com resultado publicado e a transição PUBLISHED → ARCHIVED das campanhas. Triggers de PostgreSQL criam evento e entregas na mesma transação. Evitam alterar/duplicar todos os caminhos de aprovação automática, painel e WhatsApp. Alternativa de varredura posterior foi recusada por perder eventos entre exclusão do contato e leitura do worker; chamadas HTTP durante a mutação foram recusadas por acoplamento e risco transacional.
- Uma ocorrência gera um `eventId` estável por tenant/dono/ocorrência. Entrega única por evento/destino. O corpo contém somente `{eventId,type,occurredAt,data:{resourceId}}`: sem respostas do formulário, nomes, e-mails, telefones, textos privados, URLs de convite ou tokens de página.
- HMAC SHA-256 sobre `timestamp + '.' + corpo bruto`. Headers `x-temlink-event-id`, `x-temlink-timestamp`, `x-temlink-signature`. Receptor deve aceitar apenas timestamps próximos de seu relógio (janela de cinco minutos), validar assinatura e deduplicar por `eventId`. Responder 2xx somente após registrar/aceitar o evento. Entrega é **pelo menos uma vez**, inclusive quando o receptor aceita e a resposta se perde.
- Segredo aleatório por destino, mostrado somente ao criar/renovar. AES-256-GCM no banco, com AAD de tenant/dono/destino e chave mestra própria. Não reutilizar segredo de gateway, Evolution ou JWT. Chave anterior participa de duas assinaturas por até 300 segundos após rotação e é removida pelo expurgo; o receptor precisa aceitar uma assinatura válida dentre os valores `v1=`.
- Cinco tentativas automáticas; esperas mínimas de 15s, 60s, 300s e 900s após falhas. Acordar o worker a cada 30s pode ampliar a espera. Até três reativações manuais de cinco tentativas, máximo total de 20; não há repetição infinita. Teste sintético limitado a um por destino/minuto.
- Até cinco destinos por espaço como contenção técnica inicial, sem preço ou plano novo. Histórico das 50 entregas mais recentes, retenção de 30 dias; não armazena corpo da resposta do receptor. Notas privadas e mudanças de atendimento da F35 não criam eventos novos.
- Desativar cancela pendências. Alterar URL ou remover tipos também cancela pendências anteriores, evitando redirecionar o backlog. Remover um destino apaga suas entregas. Uma requisição externa já iniciada pode terminar antes da desativação; não é possível recolhê-la.
- `integrations.read/write` integra as permissões globais; colaboradores antigos não recebem esse direito automaticamente. Operações de configuração/rotação/teste/retry são auditadas sem segredo ou payload pessoal.

## Rede, execução e dados

POST HTTPS com validação lexical e DNS em cada tentativa, IP fixado na conexão e certificado/SNI original. Recusa credenciais, portas alternativas, endereços privados e qualquer redirecionamento. Reutilizado `safe-fetch`; a validação pura de endereços foi extraída para `domain/links/public-address.ts`, mantendo os exports anteriores compatíveis. IPv6 fora do espaço global unicast também é bloqueado, cobrindo link-local e tradução NAT64. DNS e conexão têm prazo limitado; resposta mantém limite de corpo já existente.

PostgreSQL mantém a outbox e leases; BullMQ só acorda o drain. Claim com `FOR UPDATE SKIP LOCKED`, lote de cinco e lease de dois minutos. Crash deixa intenção recuperável; conclusão exige a mesma lease, impedindo um worker antigo de sobrepor o resultado de outro.

Migração aditiva `20261021130000_platform_webhooks`, sem backfill de ocorrências anteriores. Modelos/constraints compostos impedem relações entre tenants. Aplicada somente a PostgreSQL descartável. SQL do trigger e política de migração fazem parte da feature; não substituir por `db push`.

## Testes executados

- Unitários de assinatura, validação, cifragem e SSRF, além das regressões de SafeFetch/permissões: 20 aprovados na combinação executada.
- HTTP/PostgreSQL: seis testes de F30 aprovados; cobre rollback, concorrência, repetição, limite, rotação, retenção, acesso negado, captura de contato e arquivamento real de campanha. Suite junto de SafeFetch/POST: 19 aprovados.
- Componentes F30: três aprovados, incluindo erro que preserva formulário, segredo exibido uma vez e ausência de mutações sem escrita.
- Playwright desktop/mobile, junto de F24: **11 aprovados**, incluindo setup. Contato pela página pública, receptor HTTP local explícito, assinatura real, 503 seguido de retry, histórico, desativação, isolamento, recuperação, teclado e 320px. Axe não apontou violações no `main` dos cenários F30-E01.
- Lint/typecheck dos dois pacotes aprovados. Build final dos dois pacotes aprovado; capturas revistas e consolidação registrada em execucao-f36.md.

A fixture altera o transporte somente nos entrypoints E2E explícitos, proibidos em produção. O alvo sintético `receiver.f30.example` passa pelo mesmo pinning/validações e é transportado ao stub local. Nenhum endpoint real de cliente foi contatado. Sem teste em aparelho físico, CI remoto ou produção.

## Configuração, operação e reversão

Configurar `WEBHOOK_ENCRYPTION_KEY` no **backend e worker**, com os mesmos 32 bytes em base64, gerados por um gerenciador seguro de segredos. Não expor no frontend, não gravar em Git e não regenerar a chave mestra depois de cifrar destinos sem um procedimento de reencifragem. Ausência/erro de chave impede criar destinos com segurança. Redis e worker existentes também são necessários.

Para testar: criar destino HTTPS público, guardar a chave, marcar os avisos e usar **Testar envio**; acompanhar Entregas recentes. O receptor precisa validar e deduplicar o evento. O teste do painel contém apenas IDs sintéticos.

Rollback: desativar destinos e drain; remover somente as entradas/componentes desta feature. Preservar tabelas e eventos até o fim da retenção. Remover triggers exige migration compensatória revisada; não resetar banco nem apagar segredos para tentar desfazer a UI. S7/CI/liberação remotos continuam pendentes.

## Fechamento do lote — 21/10/2026

Lint/typecheck e builds dos dois pacotes: exit 0 (build Next em cópia isolada para preservar servidores de outras tarefas). Consolidação: 32 testes backend/domínio, 69 PostgreSQL e 136 frontend aprovados. Playwright final F36/F20/F19/F31: 25 aprovados, zero skips/flaky/falhas; resultados anteriores específicos desta feature permanecem acima. Atualização incremental do grafo e inspeção das capturas concluídas. Detalhes e JSON: [execução F36](execucao-f36.md); [como testar/configurar](testar-lote-2026-10-21.md). F40/F41 não iniciadas. S7/CI/deploy continuam pendentes; nenhuma migração no banco pessoal e nenhum novo commit/push.

Atualização posterior autorizada em 21/10/2026: migrations do lote aplicadas também no PostgreSQL local `localhost:5437/divulgador`, com backup fora do repositório, status atualizado e Prisma Client gerado. Commit/push deste lote autorizados na branch `codex/roadmap-f37-testes`; detalhes em [execução F36](execucao-f36.md). Produção não alterada.


## Revisão de fluxo posterior — 21/10/2026

F30 revalidada na revisão explícita das sete áreas, incluindo navegação por contextos, hierarquia, componentes da casa, busca/filtros e permissões. Resultados anteriores permanecem históricos. Mudanças, testes reais e evidências em [revisão consolidada](../frontend-profissional/revisao-fluxos-2026-10-21.md). Esta revisão está na árvore local, sem novo commit/push/deploy.
