# Auditoria e execução da experiência frontend

**Objetivo:** comparar os 34 pontos da pesquisa com o código atual e corrigir lacunas comprovadas, na branch `codex/roadmap-f37-testes`.
**Arquitetura:** preservar Next 15.5.26/React 19, CSS Modules, primitivas e regras existentes. Nenhuma dependência nova. Nenhum commit, push ou deploy.
**Escopo:** catálogo, busca, recuperação de falhas e teclado de diálogos; amostragem de conta, painel e administração. Relatório em `docs/frontend-profissional/auditoria-experiencia-2026-10-23.md`.

## Tarefas e aceite

- [x] P1: SearchBox distingue falha de ausência de resultados, invalida respostas ao sair/fechar e mantém referências ARIA válidas. Testar HTTP 503, rejeição, Escape, blur, limpeza e resposta atrasada.
- [x] P1: fallback de erro de segmento com ErrorState e recuperação, sem exibir detalhes internos. Testar chamada de reset e conteúdo público seguro.
- [x] P1: navegação de diálogo inclui select e ignora controles de diálogos internos. Testar Tab/Shift+Tab e preservar proteção de fechamento.
- [x] P2: debounce de 350 ms e AbortController no autocomplete; cancelar timer/requisição ao desmontar, limpar, fechar e trocar a consulta. Testar digitação rápida e composição IME; preservar idade, facetas, publicidade e surfaceToken.
- [x] P2: busca cancela requisições superadas; anuncia contagem e oferece saída útil do vazio, preservando filtros/URLs e evitando conteúdo antigo de outro critério.
- [x] Validar: lint, typecheck, Vitest e build frontend; seis E2E desktop/mobile, atraso/falha, teclado, reflow equivalente a 320px e axe. Runtime próprio com offset 47, sem encerrar serviços existentes. Limite: não testado zoom real/aparelho físico.
- [x] Revisar diff próprio, atualizar grafo incremental local code-only e registrar limites/reversão por trechos.

## Decisões

- Já existem skeletons, loading de botão, Field com erro associado, next/font, carregamento dinâmico de gráficos, paginação, proteção de respostas antigas, consentimento e idempotência comercial. Reutilizar.
- Não ativar prefetch, cache privado compartilhado, telemetria externa, virtualização ou prioridades de imagem arbitrárias sem medição/necessidade. Não trocar identidade nem regras comerciais.
- Árvore inicial com 688 entradas alteradas/não rastreadas. Cópias anteriores dos arquivos tocados em `output/frontend-experience-audit-2026-10-23/before`; preservar alterações preexistentes.
- A documentação de frontend ainda afirma ausência de Base UI, mas `package.json` e código já a utilizam. Código atual prevalece; registrar divergência na auditoria.
- Revisão independente corrigida: ARIA expanded segue listbox real e retry restaura foco antes de remover o botão. Revisão final não apontou bloqueios; quatro suítes/17 testes passaram.
- Validação final congelada: 180 arquivos/628 unitários, lint e tipos passaram; build e seis E2E passaram. Primeiro runner sofreu interferência no ambiente compartilhado; primeiro E2E isolado exigiu apenas correção de seletor do alert para main. Evidências e limites no relatório.
