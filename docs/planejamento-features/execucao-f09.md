# Execução F09 — perfil público

Estado em 16/10/2026: **iniciada, não concluída**. S0 aguarda a decisão de produto D10 sobre moderação de URLs que ficam apenas no perfil. A autorização atual abrange somente F09 e exige parar ao finalizar; F12 e seguintes permanecem não iniciadas. Trabalho na branch `codex/roadmap-features`, sem main ou deploy.

## Bloqueio concreto e condição de retomada

A [spec](specs/f09-perfil-publico.md#decisões-e-condições-de-liberação) determina: “Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação.” O [registro de decisões](decisoes.md) diferencia escolhas técnicas fundamentadas de novas regras de produto. D10 ainda precisa definir o tratamento de destinos exclusivos do perfil.

A revisão humana atual opera sobre Link, ModerationCase e propostas de texto do catálogo. Um ProfileItem com URL própria não pode ser cadastrado silenciosamente como Link para aproveitar essa revisão: isso poderia consumir quota, criar entrada de catálogo ou dar publicação indevida. O julgamento de texto existente também não representa, sozinho, uma política aprovada de publicação de perfis. Não se deve converter falha do provedor em aprovação.

Pergunta enviada ao usuário: validar automaticamente, bloqueando conteúdo suspeito e preservando rascunho para correção; ou exigir revisão humana na primeira publicação e após alterações. A resposta define estados, contratos, integração com revisão e oráculos de F09-AC06. Não há resposta registrada nesta execução. Essa decisão é condição para retomar a implementação dependente, sem reabrir a autorização para executar F09.

## Inventário de reuso e desenho proposto

- `AreaFrame` e `PanelNav`, reexportados pelo panel legado, fornecem sessão, suspensão, verificação e navegação. Não criar outro login. A autorização genérica permite admin; o editor privado exige proprietário, como na F04.
- `Field`, `Input`, `TextArea`, `Select` e `Button` já fornecem controles e feedback. A futura feature deve compor editor, carregamento e apresentação, com CSS Modules e tokens locais.
- `canonicalUrl` normaliza destinos e remove atribuição. Aplicar `assertPublicHttps` antes de canonicalizar para não transformar um protocolo proibido em HTTPS válido. `safeFetch`/probe existente protege DNS e redirecionamentos; não introduzir fetch irrestrito.
- `hitsBlocklist`, `preRefuse`, listas por tenant e adapter de moderação de texto são candidatos ao reuso após D10. Não passar categoria pessoal como Niche nem estender automaticamente a política de aprovação do catálogo.
- Não existe implementação de upload/armazenamento de avatar no backend atual. D10 deve registrar porta de mídia, armazenamento e validação real antes da migração. Não foi contratado provedor nem adicionada dependência. MIME e extensão não serão suficientes.
- Projeção pública allowlist, compartilhada com a prévia, deve revalidar elegibilidade das referências do catálogo e conteúdo restrito, além de excluir itens/categorias ocultos. Rascunho e snapshot publicado são estados distintos. Nenhum desses comportamentos foi implementado ainda.

Pesquisa inicial: [Linktree](https://linktr.ee/templates) foi lido e inspecionado visualmente no Chrome: identidade concentrada em coluna estreita, avatar e nome no topo. A página consultada tem pouco conteúdo; não comprova editor nem organização de categorias. [GOV.UK Summary list](https://design-system.service.gov.uk/components/summary-list/) foi lido para avaliar resumo e ações; não houve inspeção visual dessa segunda fonte nesta etapa. Direção candidata: identidade Tem Link Aqui, coluna pública legível, grupos com títulos e links empilhados; editor dividido por tarefa e prévia usando o mesmo renderer. Ainda não é um alvo validado. Refero não está entre as ferramentas disponíveis nesta sessão. Skills `temlink-components` e `temlink-ui-validation` foram consultadas; a revisão visual da implementação continua pendente porque não há interface nova.

## Preparação isolada de domínio

Somente dois contratos independentes da regra de publicação foram preparados, sem consumidor HTTP, schema ou frontend:

- `backend/src/domain/profiles/profile.ts`: slug de 3–40 caracteres ASCII, caixa normalizada e espaços externos removidos, hífens internos simples, recusa de nomes reservados (`admin`, `api`, `painel`, `login`, `cadastro`, `suporte`, `temlinkaqui`). Proposta técnica para D10; unicidade por tenant ainda exige constraint e prova concorrente no PostgreSQL.
- `orderIds`: aceita apenas permutação completa, sem omissão, inclusão ou repetição; devolve cópia e preserva entrada. Pertencimento/autorização não é concedido pela função pura.

Não há nova quota comercial ou decisão de aprovação automática. Os helpers ainda não alteram o comportamento do produto. Sua preparação não satisfaz o gate completo S1, que depende de S0 e exige U03–U05 e testes de componentes.

## Evidências e limites

Em `evidencias/F09/2026-10-16`, `domain-red.log` registra duas falhas por comportamento ausente com módulos carregados; `domain-green.log` registra os 21 casos aprovados de U01/U02. Casos negativos parametrizados não equivalem a 21 critérios de produto aprovados.

Lint, typecheck e build backend aprovados; logs separados no mesmo diretório. Regressão backend aprovada: 424 testes em 99 arquivos (403 anteriores e 21 casos U01/U02), exit code 0; `backend-tests.log`. Não houve mudança frontend, schema, lockfile, API, worker ou infraestrutura. PG, integração HTTP, componentes, Playwright e QA de interface F09 não foram executados, pois esses comportamentos ainda não existem. **Nenhum dos seis ACs foi aceito**, inclusive AC01, cuja unicidade ainda não está provada.

Retomar: responder D10, fechar os demais detalhes técnicos de S0, implementar testes U/C restantes antes das regras dependentes, depois cumprir S2–S7. Conservam-se todos os critérios e cenários originais da spec. Não avançar para F12. Reversão deste preparo: retirar os dois arquivos de domínio, sem migração de compensação ou perda de dados; manter o registro histórico e as evidências.
