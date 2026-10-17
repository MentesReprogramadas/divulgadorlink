# Revisão de páginas e convites — 17/10/2026

## Autorização e mudança de contrato

O usuário pediu a marca pequena no rodapé, conforme captura fornecida, e o mesmo ciclo de revisão dos links para Minha página e Convites: IA, aprovação automática ou revisão humana, recusa e contestação. Esta autorização funcional substitui a regra anterior de D10/F09 e a parte de D14/F12 que encerrava conteúdo suspeito com erro para correção. Não altera cobrança, quotas, categorias do catálogo, permissões ou destinos públicos existentes.

Marca: logo original de 66 px, texto de 9 px e alvo de 24 px, sem cápsula branca. No fundo escuro a logo usa versão visual branca derivada do SVG existente. Texto usa a cor legível da página; gerenciamento de cookies permanece acima. Referência é somente a assinatura pequena da captura do usuário, sem copiar outra marca.

## Fluxo implementado

Atualização solicitada pelo usuário em 17/10/2026: Minha página reaproveita o conteúdo do snapshot publicado/aprovado guardado no servidor. Aparência, ordem, organização, visibilidade, botão principal e diferenças apenas de caixa/espaçamento não reenviam esse conteúdo à IA. Remoções que não introduzem conteúdo também reutilizam a aprovação. Texto novo, foto/idade/endereço alterados e novos destinos/tipos/rótulos continuam no ciclo abaixo. A comparação é feita no backend, inclusive para itens ocultos; o cliente não informa o que considera aprovado.

Para texto novo, a IA recebe o texto aprovado e os campos alterados, com orientação para avaliar o risco da diferença e aceitar ajustes editoriais simples que conservem sentido/finalidade. A lista de bloqueio textual é aplicada ao conteúdo introduzido, sem repetir heurísticas sobre trechos já aprovados. Segurança de URL, probe, destinos bloqueados, propriedade/estado do catálogo, foto disponível, versão, conta e tenant continuam verificados. Ausência de configuração/IA ainda envia conteúdo novo para revisão humana. Convites e catálogo mantêm suas regras anteriores. [Implementação e evidências](evidencias/minha-pagina-aprovacao-2026-10-17/README.md).

1. Validar sessão, conta ativa/verificada, entrada, propriedade, HTTPS público e disponibilidade. Erro técnico ou URL insegura exige correção/retentativa; não é uma decisão editorial que o moderador possa liberar.
2. Reutilizar o classificador e limiar do catálogo (`decideProposedText`/`applyAiVerdict`). IA aprova com confiança suficiente: publica normalmente. Termo bloqueado, veredito negativo, baixa confiança, modelo/configuração indisponível ou resultado inconclusivo: registrar revisão humana, sem publicar esse envio.
3. Admin → Moderação mantém Links e acrescenta Minha página e Convites, com busca, estado vazio/skeleton e snapshot do conteúdo enviado. Apenas ADMIN ativo do mesmo tenant decide. Recusar exige motivo visível ao proprietário.
4. O proprietário vê Em revisão humana ou Recusado e pode contestar uma vez por envio recusado. Contestação reabre o mesmo caso; uma segunda recusa não libera outra contestação. Correção real enviada em nova versão inicia novo ciclo.
5. Aprovação humana revalida segurança/disponibilidade, conta, referências do catálogo, foto e versão atual. Só substitui a decisão de IA. Revisão de versão antiga, desativada, substituída ou já resolvida retorna conflito.
6. Publicação anterior continua ativa durante revisão/recusa. Em Convites, revisão substituída deixa de aparecer como pendente também no histórico; retenção 50 versões/180 dias e preservação da revisão ativa continuam.

Na primeira entrega, a revisão humana destes tipos ocorria apenas nas abas do admin. Esse limite foi superado pelo pedido seguinte do usuário: páginas, convites e suas contestações também entram na integração Evolution, conforme o complemento abaixo. O proprietário acompanha a decisão ao atualizar os dados.

## Reutilização e persistência

- Validadores existentes de F09/F12 e safe-fetch continuam responsáveis por URL, normalização, conteúdo e transporte. A aprovação humana explícita e o reaproveitamento de conteúdo já aprovado de Minha página são decisões internas; não são campos aceitos na API.
- `appeal` fornece a regra base; unicidade, autorização e bloqueios transacionais asseguram contestação única e decisões concorrentes.
- `ContentReview` guarda snapshot imutável, tipo, dono/tenant, versão, motivo, contestação e resolução. É necessário porque ModerationCase exige um Link de catálogo: fabricar um Link mudaria quotas e publicação. FKs/cascades mantêm isolamento e remoção com o recurso/conta. Perfil e revisão de convite têm unicidade de caso.
- Eventos de envio, contestação e decisão usam AuditLog existente, sem métricas publicitárias novas ou sinais internos da IA expostos ao usuário.
- `ReviewStatus` e transporte de contestação são compartilhados entre as duas jornadas; fila do catálogo continua sendo o componente existente, composto por slots no novo workspace. Primitivas Tabs, filtros, Badge, diálogo, campos e ícones existentes foram reutilizadas.

## Contratos HTTP

| Operação | Contrato |
| --- | --- |
| Publicar página | `/me/profile/publish`: aprovação devolve publishedRevisionId; revisão devolve o publishedRevisionId anterior/nulo e review. Retry na mesma versão não recria caso nem contorna recusa. |
| Salvar convite | Endpoint existente devolve PENDING_REVIEW quando necessário. Leitura privada inclui review; resolução pública só usa APPROVED. |
| Fila | `GET /admin/content-reviews?kind=PROFILE\|REDIRECT`, até 100 pendências por consulta; atualizar após decisões carrega as próximas. |
| Decidir | `POST /admin/content-reviews/:id/decision`, APPROVE/REJECT, motivo obrigatório na recusa. |
| Contestar | `POST /me/content-reviews/:id/appeal`, texto de 1–2000 caracteres após trim. Apenas dono, conta habilitada e primeiro recurso. |

## Critérios de aceitação e rastreabilidade

| Critério | Prova |
| --- | --- |
| Marca pequena sem fundo, no fim da página | E2E mede logo 66 px, alvo ≤24 px e fundo transparente; capturas desktop/mobile revisadas. |
| IA normal continua aprovando; suspeita/provedor seguem para humano | Specs PG F09/F12 e regressão E2E profiles/redirects. |
| Filas separadas e autorização real | content-reviews.pg.spec.ts e content-reviews.spec.ts com proprietário e ADMIN em contextos separados. |
| Recusa com motivo e contestação única | PG: motivo obrigatório, texto vazio, segunda contestação, motivo preservado; componente: erro de rede preserva explicação. |
| Versão anterior, concorrência e isolamento | PG: publicação anterior, troca de versão, decisões simultâneas, FK cross-tenant, conta suspensa/não confirmada; E2E real de publicação após contestação. |
| Fluxos existentes preservados | Suites profiles/redirects e Evolution, com API/BFF/banco reais e provedores locais simulados. |

## Migração e reversão

`20261017190000_content_reviews`: tabela aditiva, índices/FKs e ampliação do CHECK de status de destinos para PENDING_REVIEW/REJECTED. Nenhuma coluna de conteúdo ou publicação anterior é apagada.

Preferir reversão de interface mantendo backend capaz de ler esses estados. Downgrade completo exige inventariar e resolver/cancelar casos pendentes e compatibilizar estados dos destinos, com backup antes de remover constraints/tabela. Não converter conteúdo em aprovado como atalho. Nenhuma reversão executada.

## Validação executada — 17/10/2026

| Verificação | Resultado |
| --- | --- |
| Unitários frontend | 229 testes em 71 arquivos aprovados. |
| Unitários backend | 436 testes em 106 arquivos aprovados. |
| Integração PostgreSQL | 46 testes em quatro arquivos aprovados, incluindo os cinco novos cenários de revisão e regressão Evolution. |
| Playwright funcional | 44 aprovados em uma execução, desktop/mobile, sem retry, falhas ou skips; páginas, convites e aprovação de links pelo WhatsApp. |
| Revalidação das evidências | Quatro jornadas de revisão/contestação aprovadas após estabilizar animações das capturas; telas de recusa e contestação registradas. |
| Playwright visual | Dois cenários aprovados, quatro comparações Windows do editor e página pública; baselines revistos manualmente, alteração restrita ao rodapé. |
| Lint e tipos | Frontend e backend aprovados. |
| Build | Backend e Next em modo produção aprovados; frontend compilado em cópia isolada. |

Evidências: [capturas desktop/mobile](evidencias/revisao-paginas-convites-2026-10-17), incluindo marca, proprietário e fila do admin. Inspeção visual confirmou marca sem cápsula, abas, separação dos cards e ações. E2E cobre teclado/diálogo, validações, leitura pública após aprovação e auditoria automatizada de acessibilidade; não representa acessibilidade total.

Relatórios locais em `output/panel-redesign`: `content-review-regression-results.json`, `content-review-visual-results.json`, logs `content-review-*-accepted.log`, unitários `content-review-*-unit-final.log` e `content-review-build-final.log`. Manifesto `content-review-source-manifest.json` registra hashes do runtime comparado com a cópia validada. Resultados antigos com falhas documentam os erros corrigidos; não são usados como aceite.

A migração foi aplicada ao banco de desenvolvimento confirmado em localhost:5437 e aos bancos descartáveis dos testes. A geração do Prisma encontrou arquivo DLL bloqueado pelo servidor local no Windows; os metadados gerados, tipos, builds e execução PostgreSQL foram verificados na cópia isolada, sem encerrar o servidor do usuário. Não houve deploy nem validação de produção.

Validação usa cópia de fontes e PostgreSQL/Redis próprios, offset 100. Servidores do usuário em 3000/3333 são preservados. Serviços próprios são encerrados ao finalizar; a cópia temporária permanece, pois sua remoção foi bloqueada pela política de execução na etapa anterior. Nenhum commit, push ou deploy realizado neste lote.

## Complemento autorizado — aprovação pelo WhatsApp

O usuário pediu ampliar a aprovação no grupo para Minha página e Convites e diferenciar visualmente os avisos. A condição que encaminha para humano não mudou: IA ainda pode aprovar automaticamente conforme limiar existente. Não foi criada exigência de dupla aprovação painel + WhatsApp.

- Publicação ou troca de destino que exige humano grava ContentReview e OperationalMessage na mesma transação; contestação cria novo aviso com referência própria. Worker também recupera pendências criadas antes desta extensão.
- Os tipos REVIEW_PROFILE e REVIEW_REDIRECT usam o mesmo grupo/instância, vínculo de telefone com ADMIN, webhook autenticado, recibos persistidos e outbox existentes. Não há nova credencial ou env.
- Responder ao aviso escolhido com APROVAR ou RECUSAR motivo decide exatamente aquele envio, inclusive com várias pendências. Texto citado não concede permissão; só o ID de mensagem do provedor enviado pelo bot, com referência assinada no servidor, identifica o alvo.
- Aprovação do grupo usa decideContentReview, a mesma operação do painel. Revalida conta, URLs, disponibilidade, referências, foto e versão; vínculo do operador é conferido novamente sob lock. Decisão, consumo da referência, AuditLog, registro da confirmação no outbox e conclusão do recibo são atômicos; a entrega ao grupo ocorre pelo worker.
- Referência vence em 24 horas. Edição, desativação, substituição, recusa seguida de contestação, decisão anterior, revogação de operador ou troca de segredo impedem ação indevida. Avisos pendentes antigos são cancelados; os já entregues não são apagados do WhatsApp.
- Motivo de recusa continua obrigatório. Contestação permanece única por envio e produz outro aviso; não reutiliza a autorização do aviso anterior. Falha técnica mantém publicação/revisão intactas e explica como tentar de novo.
- Decisão pelo painel também produz confirmação no grupo. Falha de entrega não bloqueia o painel, pagamentos ou publicação já decidida. Entrega incerta conserva o fluxo de confirmação/reprocessamento existente.
- Página inclui responsável, título, bio, endereço, grupos/links visíveis, versão e faixa etária. Convite inclui responsável, título, destino, versão e faixa etária. Mensagens resumem até quatro grupos/três links por grupo, com limite de texto e acesso ao painel para o conteúdo integral. Não enviam e-mail, telefone do usuário, credenciais ou snapshot bruto.

| Aviso | Identificação visual |
| --- | --- |
| Link em revisão | 🔗 |
| Página em revisão | 🪪 |
| Convite em revisão | 🎟️ |
| Alteração de texto de link | ✏️ |
| Contestação, com tipo no título | 📣 |
| Aprovação / recusa | ✅ / ❌ |
| Comando não aplicado | ⚠️ |
| Falha de estorno | 💸 |
| Entrega recuperada | 📬 |

Títulos e blocos de conteúdo/ação permanecem curtos e separados por linhas em branco. O emoji complementa o título; não substitui a informação textual. O parser e a escolha da citação continuam independentes do desenho e do texto do aviso.

Sem migração adicional, mudança de dependência, commit, push ou deploy. Não houve envio de teste ao grupo real nesta etapa: Evolution foi simulada localmente. Reversão de código deve resolver ou cancelar os avisos REVIEW_PROFILE/REVIEW_REDIRECT pendentes antes de retirar o suporte do worker, preservando revisões e decisões auditadas.

### Validação executada da extensão

- Backend: 438 unitários (106 arquivos) e 51 PostgreSQL (quatro arquivos) aprovados. Incluem motivo obrigatório, citação de recurso exato, tenant, revogação concorrente, recusa/contestação, aviso antigo/expirado, rollback da revalidação, idempotência e disputa com o painel.
- Playwright: 44 cenários de regressão aprovados; as duas novas jornadas falharam inicialmente por ausência de CSRF no helper do teste. Helper corrigido para enviar o token como a aplicação faz. Reexecução focada: dois aprovados (desktop/mobile), zero skips/retries/falhas. São 46 cenários únicos validados, em execuções separadas; o relatório inicial com as duas falhas não é um aceite integral.
- Lint e tipos frontend/backend aprovados. Build backend aprovado; Next em modo produção compilou na cópia isolada usada no E2E. Sem alteração de componentes ou layout nesta extensão.
- [Mensagens capturadas no provedor simulado](evidencias/whatsapp-paginas-convites-2026-10-17): exemplos desktop/mobile de revisão de página, convite, contestação, recusa, aviso expirado e aprovação, com apenas dados sintéticos. Texto efetivamente entregue foi inspecionado para hierarquia, espaços, símbolos, conteúdo e ação. Não é um ensaio em aparelho real.
- Logs/relatórios locais: `output/panel-redesign/whatsapp-content-{unit,pg,e2e,new,lint,types-final,backend-build,frontend-lint,frontend-types}.log`; `whatsapp-content-e2e-results.json` (execução inicial, 44/46) e `whatsapp-content-new-results.json` (dois novos aprovados). Build Next no `server.log` da cópia isolada. Manifesto de hashes `whatsapp-content-source-manifest.json`.
- Serviços de teste próprios encerrados no fechamento; servidores do usuário preservados. Nenhuma alteração de env no Coolify nem ensaio/deploy em produção.
