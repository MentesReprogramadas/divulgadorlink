# F36 — Clientes e agência

**Estado:** S0–S6 implementados e validados localmente em 21/10/2026; S7 EM REVISÃO. Ordem 40, onda 6. Branch `codex/roadmap-f37-testes`, alterações em WORKTREE, sem novo commit/push/deploy. Execução encerrada nesta feature por pedido do usuário.

**Dependências:** G00, F42 (prioridade), F20 (permissões), F11 (planos), F21 (relatórios). [Plano](../planos/f36-agencias.md), [execução/D38](../execucao-f36.md), [guia local](../testar-lote-2026-10-21.md), [arquitetura](../arquitetura-e-reuso.md).

## Objetivo e fronteira

Gerenciar páginas autorizadas de vários clientes, mantendo contas reais, identidade visual, relatórios e permissões separados. Agência não é tenant e não passa a ser dona da página por adicioná-la ao portfólio. A titularidade continua com o cliente até uma transferência explícita.

D38 concretiza o pacote inicial como portfólio gratuito com até dez clientes ativos, limite técnico. Cada cliente mantém sua assinatura F11. Não há nova oferta agregada, checkout ou preço; essa alternativa comercial permanece fora desta entrega. A escolha e as demais alternativas estão no registro de execução.

## Jornada no painel

- **Clientes**: lista com busca, filtro de acesso, adicionar página já autorizada, editar/consultar, métricas do cliente e remover do portfólio. Remover não apaga a página. O vazio guia cliente → convite F20 → aceite → portfólio.
- **Acessos por cliente**: titular da agência solicita Leitor/Editor para uma pessoa ativa de sua equipe global. O titular do cliente precisa aprovar; pertencer à agência não concede acesso automático a todas as páginas.
- **Transferir página**: titular atual pede; destinatário confirmado sem página aceita em até sete dias. Ambos consentem com dados, revogações e cobrança separada. Alteração concorrente do rascunho impede aceite com versão antiga.
- Edição usa `/painel/equipe/:id/editar`; relatório usa `/painel/equipe/:id/metricas`, identificando a página. Transferências são sempre pessoais, inclusive após sair de um espaço compartilhado. Navegação troca de contexto por mecanismo F20 existente e reinicializa o estado.

## Reutilização e interface

Reutiliza ProfileMembership, convites F20, workspace/access, editor/prévia, renderer público, métricas F31, cobertura F11, auditoria, BFF/CSRF e controles locais. Portfólio, aprovação derivada e transferência são responsabilidades novas, isoladas em repositories específicos. Nenhuma biblioteca nova.

Ações à direita, filtros em card separado, vazios orientados, skeletons equivalentes, erros conservando entrada, diálogos com confirmação e retorno de foco. Navegação entre rotas usa links reais, com Select da casa quando apertado; não simula abas sem painéis. Identificadores/ícones de portfólio, aprovação e transferência têm desenhos diferentes.

## Dados e invariantes

`AgencyWorkspace`, `AgencyClient`, `AgencyAccessRequest`, `AgencyProfileTransfer`, no tenant existente. Migração `20261021170000_agency_clients` adiciona constraints compostas, idempotência e estados. Não transforma clientes em contas fictícias, não amplia quotas do catálogo e não altera preços.

- API valida usuário ativo/confirmado para operações sensíveis, tenant, dono, direito da página e grants `agency.read/write`; operador real é auditado. Interface não concede autorização.
- Concessão derivada vincula ID/versão da equipe global e do acesso da agência à página. Revogar/mudar qualquer vínculo nega imediatamente a API e oculta dados. Concessão direta posterior pelo titular é preservada.
- Máximo dez pedidos pendentes por cliente; pedidos expiram em sete dias. Aprovados ativos mantêm a prova do vínculo. Encerrados/expirados são retidos por 180 dias; limpeza reconcilia até cem concessões inválidas por ciclo antes de apagar provas expiradas.
- Transferência usa hash do e-mail, CAS da página e pedido, locks ordenados de usuários, uma transação e auditoria. Não grava e-mail de destino em claro no pedido. Recibo congela nome/slug da proposta e não revela futuras edições privadas do novo dono.
- Preserva URL, publicação, conteúdo de snapshots, contatos/notas e histórico. Copia fotos atuais; não ressuscita foto removida de versão antiga. Moderação pendente é invalidada, equipe/convites anteriores revogados, testes encerrados e descoberta/medição pausadas.
- Assinatura/faturas, links do catálogo, convites independentes, permissões globais e webhooks não são transferidos. Benefícios passam a depender do novo dono. Canais dependentes de convites independentes podem ficar indisponíveis.
- FKs que propagam ownerId são `DEFERRABLE INITIALLY IMMEDIATE`; somente a transação de transferência adia a checagem. Revisões permitem exclusivamente a troca de ownerId no contexto auditado da página, sem alterar o JSON. FK futura não preparada causa 503 e rollback integral, em vez de transferência parcial.

## Contratos implementados

Prefixo `/api/v1`; tenant vem do host e sessão, nunca do corpo. Todas as operações privadas passam pelo BFF/CSRF e não expõem hashes/tokens em DTO.

| Operação | Entrada principal | Resultado |
| --- | --- | --- |
| GET/POST `/me/agency/clients` | criar: `profileId,name` | portfólio/choices/capacidade ou ID idempotente |
| DELETE `/me/agency/clients/:id` | `expectedVersion` | arquiva sem apagar página |
| GET/POST `/me/agency/access` | solicitar: `clientId,userId,role,requestKey` | pedidos disponíveis ou ID |
| POST `/me/agency/access/:id/decision` | `expectedVersion,approve` | decisão do próprio titular |
| GET/POST `/me/agency/transfers` | pedir: `profileId,recipientEmail,expectedVersion,consent:true,requestKey` | recibos/ID sem e-mail/hash |
| POST `/me/agency/transfers/:id/accept` | `expectedVersion,consent:true` | transferência atômica/idempotente |
| POST `/me/agency/transfers/:id/decline` ou `/cancel` | `expectedVersion` | recusa do destino/cancelamento da origem |
| GET `/me/profile/interaction` e `/measurement` | `x-profile-id`, filtros existentes | página identificada e relatório isolado, sem permissão de configurar medição |

Erros existentes: 400 inválido, 401 anônimo, 403 sem direito, 404 recurso alheio, 409 conflito/condições do pedido alteradas, 422 capacidade/destino inválido, 429 excesso de pedidos, 503 esquema não preparado. Erro não anuncia sucesso nem limpa entrada válida.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F36-AC01 | isolamento de dados e permissões entre clientes | F36-T01 | I/PG |
| F36-AC02 | identificação clara da página em edição | F36-T02 | I/PG |
| F36-AC03 | definição de limites e cobrança | F36-T03 | I/PG |
| F36-AC04 | procedimento de transferência de titularidade | F36-T04 | ADR + I/E |
| F36-AC05 | relatórios sem mistura de resultados. | F36-T05 | I/PG |

## Evidências por critério

| Critério | Prova local |
| --- | --- |
| AC01/T01 | F36-PG01/02/06: conta/tenant, revogação, vínculos, expiração; E01/E02: duas sessões e ausência de outro cliente |
| AC02/T02 | PG05 e E01: editor/métricas mostram ID/nome correto; hook descarta resposta de contexto anterior |
| AC03/T03 | PG01 capacidade/default/idempotência; PG03 assinatura original preservada; D38 sem cobrança nova |
| AC04/T04 | PG03/04: dois aceites, CAS, destino ocupado, confirmação perdida, esquema incompatível/rollback, snapshots/contatos/fotos; E03 transferência real |
| AC05/T05 | PG05 dois clientes com contagens 10/20 e nenhum cruzamento; E01 relatórios com página identificada |

Unitários: domínio de agência e componentes/hooks. PostgreSQL real: `backend/src/http/agency.pg.spec.ts` (6 casos). Playwright: `frontend/e2e/agency.spec.ts` nos dois projetos; F20/F19/F31 como regressão. Capturas e relatório vinculados em [execução](../execucao-f36.md). Nenhum teste em produção, aparelho físico ou CI remoto foi declarado concluído.

## Configuração e liberação

Mesmos PostgreSQL, Redis, autenticação e worker existentes. Nenhum segredo/provedor extra para F36. Aplicação ao banco pessoal/produto e CI/liberação dependem de execução autorizada. Plano de reversão preserva tabelas, páginas e assinaturas; retirar entradas/novas operações e revogar concessões derivadas com auditoria. Uma transferência aceita exige nova transferência consentida para voltar; não desfazer ownerId por SQL nem apagar snapshots.

## Fonte integral da feature

**Objetivo:** atender profissionais que gerenciam páginas de vários clientes.

**Escopo inicial:** conta com vários perfis de clientes, identidade visual e relatórios separados; atribuição de colaboradores por cliente. Evolução do recurso de equipe e permissões.

**Critérios de conclusão:** isolamento de dados e permissões entre clientes; identificação clara da página em edição; definição de limites e cobrança; procedimento de transferência de titularidade; relatórios sem mistura de resultados.

**Indicadores:** contas com vários clientes, páginas gerenciadas por conta e renovação dos pacotes.

