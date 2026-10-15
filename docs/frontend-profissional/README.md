# Programa de frontend profissional — Tem Link Aqui

Data: 15/10/2026. Estado: usuário autorizou piloto e passagem por todas as telas; implementação e verificação em andamento.

## Objetivo

Construir uma base profissional de engenharia, UX/UI e Design System: fronteiras claras, conceitos reais do produto, componentes coesos, linguagem visual consistente e verificação funcional e visual. A redução de CSS global é consequência dessa organização, não o objetivo do programa.

## Documentos e autoridade

- [Arquitetura e padrões](arquitetura.md): estrutura, dependências, composição, tipagem e migração.
- [Design System](design-system.md): proposta de fundações, catálogo e registro de decisões.
- [Ferramentas](ferramentas.md): matriz, fontes oficiais, configuração, versões e limitações.
- [Piloto e qualidade](piloto-e-qualidade.md): escopo revisável, critérios e sequência de execução.
- [Evidências de verificação](verificacao.md): testes de conexão, validação das Skills e limites desta etapa.
- [Implementação e revisão das telas](implementacao.md): mudanças executadas e verificações da versão atual.
- ../../AGENTS.md: proteções comuns e limites de autorização; Skills são procedimentos especializados e não redefinem essas proteções.

## Baseline observado

Next 15.5.26, React 19, TypeScript strict, CSS próprio, npm e testes Vitest/Testing Library/Playwright. Não há Tailwind, shadcn, Radix ou Base UI no frontend. Há primitivas e feedback reutilizáveis; não é necessário substituir tudo.

Na auditoria inicial, globals.css tinha 2.448 linhas e panel.tsx, 575. O segundo concentra sessão, proteção de área, navegação e composições. Esse tamanho indica responsabilidades a avaliar, não uma meta arbitrária de linhas. A rota real da home é app/page.tsx; a existência de components/domain/home-page.tsx não comprova seu uso pela rota.

A situação local foi revista nesta etapa: as mudanças anteriores de suspensão já estão no commit 98286dd; permanece output/ não rastreado. Não limpar ou versionar esse diretório como parte do programa.

## Pontos de produto que antecedem o redesenho

| Questão | Evidência | Tratamento |
| --- | --- | --- |
| Landing separada do catálogo | /divulgar e / têm objetivos e fontes de dados diferentes | Preservar distinção de intenção e conteúdo. |
| Navegação da landing | layout atual e advertise.spec.ts exigem logo para / e Busca; commit 691c627 | Manter o comportamento atual no piloto; plano anterior foi superado. |
| Análise humana prometida | texto de /divulgar e novo envio; settle-submission e enqueue-moderation permitem automação condicional | Decisão de produto pendente. Não afirmar qual configuração está ativa em produção. Manter o texto no piloto visual ou obter decisão específica antes de revisá-lo. |
| Gratuito versus destaque | landing e assertCheckout | Explicar a diferença antes do CTA; não transformar publicação em checkout. |
| Sessão e suspensão | panel-gate, session e controles do servidor | Incluir estados nos testes; não inferir autorização de cookie de papel. |
| Conversão | campaign-touch, funnel.spec.ts e consent | Medir progresso real sem alterar eventos ou coletar dados pessoais adicionais. |

## Sequência e aprovação

| Fase | Entrega | Condição de saída |
| --- | --- | --- |
| 0 — preparação atual | AGENTS, cinco Skills, MCPs, arquitetura, proposta de DS e critérios | Arquivos revisáveis e configuração verificada; sem mudança da aplicação. |
| 1 — piloto autorizado | Capturas de baseline, pesquisa visual, composição e implementação de /divulgar | Resultado renderizado, fluxo e checks aprovados; nenhuma migração das outras páginas. |
| 2 — consolidação | Tokens e componentes aprovados; documentação isolada e decisão de Storybook executada | Reutilização demonstrada, catálogo de variantes e regressões estáveis. |
| 3 — publicação | Cadastro, login, verificação e envio | Jornada integral, rascunho, erros e permissões preservados. |
| 4 — descoberta | Catálogo, busca, facetas, detalhe e saída | SEO, conteúdo restrito, patrocinados e métricas preservados. |
| 5 — áreas privadas | Conta, painel, links, pedidos e promoção | Sessão, suspensão, tabelas, pagamentos e estados completos. |
| 6 — operação | Administração, moderação e estornos | Densidade adequada, ações críticas claras e autorização preservada. |

Não estipular prazo sem medir o piloto. Cada fase pode ser dividida por jornada e risco. Promoção/pagamento e administração merecem lotes menores do que uma página puramente informativa.

## Autorização de execução

Após revisar a preparação, o usuário autorizou implementar e percorrer todas as telas sem novas pausas de aprovação. O plano continua incremental por risco e jornada; a validação técnica de um lote antecede o seguinte. Mudanças comerciais, deploy e serviços externos pagos continuam fora desse escopo.
