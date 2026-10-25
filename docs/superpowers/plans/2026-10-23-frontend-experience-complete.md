# Fechamento das pendências da experiência frontend

Objetivo: executar as lacunas remanescentes comprovadas da matriz dos 34 tópicos, preservando a branch `codex/roadmap-f37-testes`, as regras do produto e a direção Ondas aprovada. Sem commits, push, deploy ou dependências novas.

## Frentes independentes

- [x] Mídia: variantes limitadas de largura após autorização no endpoint público, srcset/sizes locais, ícones leves e fallback. Preservados WebP, tenant, idade, moderação e no-store. Testes de pixels e de acesso real no PostgreSQL aprovados.
- [x] Formulários: corrigidas falhas de rede/storage e resumo navegável no novo link, preservando etapas, conteúdo, capacidades e envio único. Testes de componente aprovados; integração no fechamento.
- [x] Recuperação e privacidade: global-error independente do root layout e cache privado por padrão no BFF somente quando upstream omite política. Testes de recarregamento do documento, mensagens públicas e cabeçalhos aprovados; reset de segmento preservado.
- [x] Navegação: perda de lotes reproduzida em desktop/mobile (48 → 24). Histórico guarda quantidade de lotes, caminho e posição, sem cartões/tokens/cursores. Replay pela cadeia ATUAL do backend, cuja ordenação inicial usa seed novo. loadCatalog reutilizado na home SSR para encaminhar idade validada. Retorno do detalhe e dos filtros SPA aprovados nos dois viewports; scroll limitado a 500 ms com flush antes da navegação.
- [x] Medidas locais de LCP, CLS, tarefas longas e latência de interação sob condições fixas em desktop/mobile, três visitas por rota. Sem RUM/eventos novos; laboratório separado de Core Web Vitals de campo. Resultados variam nos dois sentidos, sem ganho percentual alegado.
- [x] Lint/tipos/unitários/build dos pacotes alterados aprovados; 671 testes frontend, cinco testes de domínio e duas provas PostgreSQL de mídia. E2E final 30/30, axe, foco, imagens e capturas examinadas. Matriz e índice incremental local atualizados. Fechamento em docs/frontend-profissional/fechamento-experiencia-2026-10-23.md.

## Limites

A revisão encontrou dois problemas na primeira hipótese de restauração: comparar o cursor anterior impediria replay após a nova ordenação, e a home SSR não encaminhava a idade usada na paginação. As correções usam contagem e o transporte existente. O conteúdo pode mudar ao voltar, pois visibilidade, autorização e ordenação são reavaliadas; não armazenar respostas antigas para simular estabilidade.

Prefetch global e virtualização não são requisitos sem ganho comprovado. Não reintroduzir o botão de pausa removido da direção aprovada: testes atuais explicitam a decisão; reduced-motion/visibility/fallback permanecem. Aparelhos físicos, infraestrutura de produção/CDN e dados de campo não podem ser simulados como validação concluída. Árvore inicial com 758 alterações/não rastreados: preservar; backups por frente em `output/frontend-round2-2026-10-23`.
