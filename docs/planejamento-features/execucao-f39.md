# F39 — Idiomas da página

Implementação local em 21/10/2026. **Painel → Minha página → Edição → Idiomas**. Reutiliza editor de rascunho, CAS/autosave, iPhone da prévia, prévia privada, publicação/moderação da página e histórico da F19.

## D41 — Escolhas e alternativas

- Português (`pt-BR`), inglês (`en`) e espanhol (`es`). Tradução manual; não foi contratado tradutor/IA nem introduzido custo. A alternativa de detecção automática foi descartada nesta versão: o visitante escolhe o idioma explicitamente, sem novo cookie de preferência ou rastreamento de idioma.
- Idioma original configurável; as outras duas entradas são opcionais. Para trocar o original depois de traduzir, remover as traduções explicitamente primeiro. Evita trocar silenciosamente o significado de textos existentes.
- Traduz nome, descrição, nomes dos grupos e textos dos botões. Eventos traduzem o CTA, preservando título e detalhes originais. URLs, identidade do bloco, idade, agenda e elegibilidade são compartilhados. Formulário e textos operacionais permanecem em português, com idioma marcado no HTML.
- Campo vazio usa original; cada campo mostra o original e a orientação de fallback. Grupos e botões são selecionados individualmente em etapas. Prévia ao vivo mostra o idioma em edição; abrir prévia completa salva antes de navegar e permite voltar ao editor.
- `?locale=en|es|pt-BR` compõe SSR, API, busca e cursor. Um cursor de outro idioma é recusado; não mistura resultados. Idioma sem conteúdo público volta ao original. Canonical por variante e alternates apenas para traduções publicadas elegíveis; política existente de `noindex` preservada.
- Traduções pertencem ao mesmo snapshot/versionamento da publicação. Textos entram na avaliação de IA, bloqueios e revisão humana; fila admin mostra todas as traduções. Aviso do WhatsApp identifica os idiomas e leva aos textos completos no painel; aprovação continua vinculada ao hash da mesma revisão. Rascunho ou recusa não muda página pública.
- Labels de blocos ocultos, futuros, removidos e inelegíveis são eliminados da projeção. Exportação/importação inclui traduções e remapeia IDs. Clientes antigos que omitem o campo preservam traduções existentes; remover exige lista vazia explícita. Descartar/restaurar usa o agregado existente, sem histórico paralelo.

## Evidências locais

- Domínio/exportação/moderação/fallback: 12 testes aprovados na execução conjunta inicial.
- PostgreSQL/HTTP de perfis: **19 aprovados**, incluindo 3 casos F39, publicação atômica, revisão humana, CAS, isolamento, descarte, remoção de órfãos e cursor entre idiomas.
- Frontend: **92 testes aprovados** em 28 arquivos de perfis, contatos, descoberta e webhooks.
- Playwright dirigido F39: **5 aprovados** (desktop, mobile e setup), 49,7s. Edição das três etapas, prévia salva, publicação, fallback, idiomas/metadados, erro sem perda de texto e 320px. Axe da página pública: nenhuma violação nos critérios executados.
- Regressão F18/F19/F39 anterior: 16 aprovados e uma falha de foco na troca de idioma. Corrigida a causa: seletor permanecia desativado durante busca e perdia foco. Repetição dirigida F39 passou; F18/F19 passaram nos 12 cenários executados dessa regressão.
- Capturas inspecionadas em `docs/frontend-profissional/evidencias/f39-roadmap-2026-10-21/`. Lint/typecheck frontend aprovados; build frontend isolado executado pelo harness. Checks do lote e atualização incremental do grafo concluídos; ver fechamento em execucao-f36.md.

## Migração e limites

`20261021150000_profile_translations` é aditiva, com FK de perfil/tenant/dono. Aplicada somente a bancos descartáveis. S7, CI, deploy e validação em produção pendentes. Sem migração pessoal ou configuração externa nesta rodada. Para reverter a UI, retirar a entrada Idiomas mantendo a tabela e snapshots; não apagar traduções nem reescrever histórico automaticamente.

## Fechamento do lote — 21/10/2026

Lint/typecheck e builds dos dois pacotes: exit 0 (build Next em cópia isolada para preservar servidores de outras tarefas). Consolidação: 32 testes backend/domínio, 69 PostgreSQL e 136 frontend aprovados. Playwright final F36/F20/F19/F31: 25 aprovados, zero skips/flaky/falhas; resultados anteriores específicos desta feature permanecem acima. Atualização incremental do grafo e inspeção das capturas concluídas. Detalhes e JSON: [execução F36](execucao-f36.md); [como testar/configurar](testar-lote-2026-10-21.md). F40/F41 não iniciadas. S7/CI/deploy continuam pendentes; nenhuma migração no banco pessoal e nenhum novo commit/push.

Atualização posterior autorizada em 21/10/2026: migrations do lote aplicadas também no PostgreSQL local `localhost:5437/divulgador`, com backup fora do repositório, status atualizado e Prisma Client gerado. Commit/push deste lote autorizados na branch `codex/roadmap-f37-testes`; detalhes em [execução F36](execucao-f36.md). Produção não alterada.


## Revisão de fluxo posterior — 21/10/2026

F39 revalidada na revisão explícita das sete áreas, incluindo navegação por contextos, hierarquia, componentes da casa, busca/filtros e permissões. Resultados anteriores permanecem históricos. Mudanças, testes reais e evidências em [revisão consolidada](../frontend-profissional/revisao-fluxos-2026-10-21.md). Esta revisão está na árvore local, sem novo commit/push/deploy.
