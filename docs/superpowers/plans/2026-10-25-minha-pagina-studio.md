# Minha página — plano de implementação do editor visual profissional

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans para executar tarefa por tarefa; superpowers:subagent-driven-development é alternativa somente se esse método for autorizado. Os passos usam checkboxes. Este documento não inicia execução.

**Goal:** entregar um editor profissional de páginas pessoais com 20 estilos, composição responsiva, componentes ricos, mídia própria, animações, 3D e capacidades comerciais verificadas.

**Architecture:** evoluir o ProfileContent com pageDocument v2, preservando leitor v1, IDs canônicos e publicação atual. Compartilhar apresentação entre público e prévias, com ilhas cliente apenas para interação. Mídia visual tem pipeline, autorização, revisão e retenção próprios; regras de plano continuam no servidor existente.

**Tech Stack:** Next 15.5.26, React 19, TypeScript, CSS Modules, Base UI já instalada, Fastify, Prisma/PostgreSQL, BullMQ/Redis, Sharp, Vitest e Playwright Test. Armazenamento S3, transcodificação e runtime 3D/2D são propostas sujeitas aos estudos e aprovações descritos; não são dependências já adotadas.

**Spec:** [2026-10-25-minha-pagina-studio-design.md](../specs/2026-10-25-minha-pagina-studio-design.md).

**Pesquisa:** [fontes e limites](../specs/2026-10-25-minha-pagina-pesquisa.md).

**Reuso pesquisado:** [bibliotecas, assets, MCPs e skills](../specs/2026-10-25-minha-pagina-bibliotecas-prontas.md). Embla, Motion core, Paper Shaders e Three/Fiber/Drei são candidatos a avaliar nas tarefas abaixo; nenhuma dependência foi instalada/adotada.

**Estado:** PLANO PROPOSTO; nenhuma tarefa de implementação executada nesta entrega. O usuário autorizou pesquisar e criar spec seguida do plano, sem escrever código. A elaboração dos dois documentos não autoriza executar este plano, instalar pacotes, contratar fornecedores ou alterar cobrança.

## Global Constraints

- Publicação gratuita, destaque pago separado e elegibilidade confirmada pelo servidor; sem prometer audiência.
- Marca da plataforma permanece em todos os planos. Não vender remoção de marca.
- Editor gratuito atual, categorias, aparência e histórico continuam gratuitos; história atual de 50 revisões/180 dias não vira paywall.
- Sessão, canSubmit, suspensão, permissões de equipe, tenant e propriedade de mídia permanecem no servidor.
- Rascunho, revisão e publicação continuam distintos. Nova mídia ainda não aprovada não substitui a publicada.
- Preservar aprovação automática condicional e revisão humana existentes; não prometer análise exclusivamente humana.
- Consentimento e ausência de marketing antes do aceite; sem dados pessoais em eventos novos.
- Canonical, robots, sitemap, metadados e HTML público no servidor.
- Os 20 estilos coexistem e não serão substituídos por uma única direção estética.
- Não instalar bibliotecas de UI, trocar frameworks ou modificar lockfiles como efeito de uma mudança apenas visual. Dependências de mídia/runtime exigem decisão própria.
- Não criar branches/commits, realizar push, contratar serviços ou fazer deploy sem pedido específico. “Commit” das skills é substituído aqui por revisão de diff e checkpoint documental.
- Limites da spec: 40 seções, 120 blocos, profundidade 3, 20 slides/carrossel, 50 imagens/galeria; preservar 100 grupos/500 links. MiB = 1.048.576 bytes. Limites de mídia e quotas são hipóteses propostas, dependentes de spike e aprovação.
- CSS/WAAPI primeiro; Motion core é candidata para DOM avançado, Rive/dotLottie somente para assets específicos. Three direto/Fiber 9 com Drei/model-viewer são caminhos alternativos; Paper Shaders compartilha orçamento GPU com 3D. Não carregar todos por padrão. `ssr:false` pertence à ilha cliente, não ao Server Component.
- MCP/skill ajuda a desenvolver, não integra o runtime do visitante. Copiar componente exige licença/atribuição e revisão iguais às de pacote; não executar instaladores ou criar Tailwind/provider global para aproveitar um efeito.

## Review Focus

1. Cliente antigo salva perfil v2 e apaga composição: rejeitar remoção implícita e recuperar rascunho; teste RF01 na tarefa 02.
2. Asset removido do rascunho ainda aparece em revisão/campanha: retenção revalida todos os vínculos antes de excluir; RF02 na tarefa 05.
3. Item fora da página carregada some do bento/carrossel: resolução usa identidade canônica e paginação real, sem inferir ausência; RF03 nas tarefas 03/11.
4. Cobertura expira com modelo/vídeo publicado: projeção autorizada mantém alternativa e não vaza bytes nem apaga conteúdo; RF04 nas tarefas 04/19.
5. GLB contém referências externas ou explode memória embora passe o validador: pipeline impede rede e aplica orçamento/timeout; RF05 na tarefa 16.

## Método de execução e checkpoints

Cada tarefa começa relendo o estado do Git e os arquivos citados, preserva alterações alheias e termina com diff, testes afetados e evidência. Os testes abaixo são oráculos futuros, não resultados já obtidos. Não foram escritos snippets executáveis porque o pedido desta etapa exclui código.

Antes de implementação, revisar spec e registrar aprovação do escopo. Para cada lógica não trivial: escrever o caso que falta, confirmar falha pelo comportamento esperado, implementar a menor mudança completa e confirmar aprovação. Falha por fixture quebrada ou import não representa prova suficiente do comportamento.

Spikes são atividades futuras identificadas, com artefato e decisão de saída; não instalar “para pesquisar” nesta entrega. Se um spike mudar um limite, atualizar spec e testes antes de seguir. Não bloquear fundação local por contrato de fornecedor ainda ausente; manter desligada a integração que depende dele.

Por ser um único produto com documento e publicação compartilhados, este plano mantém um índice integrado. As ondas abaixo são subprojetos verificáveis; não declarar uma onda como entrega de todo o programa.

| Onda | Tarefas | Dependência e entrega verificável |
| --- | --- | --- |
| A — decisões/fundação | 01–04 | Contrato, migração, apresentação e política sem perda; nenhum recurso novo vendido. |
| B — mídia segura | 05–08 | Storage/retenção/revisão e imagens de cards/fundos. Requer decisões operacionais de 01. |
| C — identidade/editor | 09–10 | 20 estilos, fundos leves e composição responsiva com recuperação. |
| D — componentes | 11–13 | Galerias, carrosséis, blocos de negócio e mídia de conteúdo completos. |
| E — movimento/3D | 14–16 | Sequências, cenas prontas e GLB próprio com fallback e revisão. |
| F — produtividade/integrações | 17–18 | Kit de marca, salvos, idiomas, templates e backup v2. |
| G — comercial/operação | 19–20 | Oferta nova somente após aceite técnico/comercial e evidência integrada. |

## Arquivos e responsabilidades

Os caminhos abaixo são relativos à raiz. “Novo” significa proposto, não arquivo já criado. Reconciliar com a árvore durante execução; não criar arquivo duplicado só para corresponder ao plano.

| Responsabilidade | Existentes a preservar/ampliar | Novos propostos |
| --- | --- | --- |
| Documento | `backend/src/domain/profiles/profile.ts`, `profile-input.ts`; `frontend/src/features/profiles/profile-contract.ts` | `backend/src/domain/profiles/page-document.ts`; `frontend/src/features/profiles/page-document.ts` |
| Regras visuais | `appearance.ts`; `profile-appearance.ts` | `backend/src/domain/profiles/page-design.ts`, `page-design-catalog.ts`; frontend `page-design.ts`, `page-design-catalog.ts` |
| Persistência | `backend/src/repositories/profiles-repository.ts`, `profile-revisions.ts`; `backend/prisma/schema.prisma` | `backend/src/repositories/profile-page-document.ts`, `profile-visual-assets.ts`, `profile-visual-references.ts` |
| Política | `backend/src/domain/billing/profile-plans.ts`, `repositories/profile-capability-coverage.ts`, `lib/profile-billing.ts` | `backend/src/domain/profiles/page-visual-policy.ts` |
| Pipeline | `backend/src/repositories/profile-media.ts`, preparação `domain/links/link-media.ts`, `backend/src/worker.ts` | `backend/src/domain/profiles/visual-asset.ts`, `domain/profiles/visual-asset-store.ts`, `adapters/media/s3-visual-asset-store.ts`, `use-cases/@Profiles/process-visual-asset.ts`, `prune-visual-assets.ts` |
| HTTP | `backend/src/http/controllers/@Profiles/routes.ts`, BFF existente | `backend/src/http/controllers/@Profiles/visual-assets.ts`, `design-catalog.ts` |
| Renderer | `components/profile-view.tsx`, `personal-page.module.css`, `profile-explorer.tsx`, `profile-live.tsx` | `frontend/src/features/profiles/components/page-document-view.tsx`, `page-section.tsx`, `page-block.tsx` e CSS Modules locais |
| Editor | `profile-editor.tsx`, `use-profile-draft.ts`, `profile-diff.ts`, `profile-api.ts`, toolbar, controles existentes | `components/page-composer.tsx`, `page-inspector.tsx`, `page-block-library.tsx`, `use-page-history.ts` |
| Widgets | Vídeo, contato, evento e canais existentes | Componentes focados em `frontend/src/features/profiles/components/blocks/` |
| Efeitos | CSS e APIs nativas | `frontend/src/features/profiles/visual-effects/` com host 2D/3D e módulo por responsabilidade, somente após spike |
| Marca e salvos | Templates por atividade existentes | `backend/src/domain/profiles/page-preset.ts`, `repositories/profile-page-presets.ts`; frontend `page-brand-kit.tsx`, `page-presets.tsx` |
| Evidências | Configs Vitest/Playwright e suítes existentes | `docs/superpowers/evidence/minha-pagina-studio/` para matrizes e relatórios gerados na execução |

Migrar schema aditivamente com migrações novas nomeadas pela data real da execução, não pela data desta pesquisa. Não editar migrações já aplicadas. Registrar índices motivados pelas consultas de referências, ACL e fila. Código de armazenamento de avatar continua válido até a migração deliberada de cada uso.

## Tarefa 01 — decisões verificáveis e ficha operacional

**Depende:** revisão da spec. **Cobre:** MP-23/24/25.
**Arquivos:** spec; novos ADRs/evidências dentro de `docs/superpowers/evidence/minha-pagina-studio/`; sem código nesta etapa de decisão.
**Interfaces:** produz ficha aprovada de storage/processamento, matriz comercial, limites e protocolo de benchmark; tarefas seguintes consomem esses valores.

- [ ] Registrar aceite do escopo, alternativas e diferenças comerciais propostas; separar recursos atuais dos novos. Manter nova venda desligada.
- [ ] Registrar ficha dos candidatos do complemento: versão/commit, licença do artefato e assets, avisos, dependências, requests externos, custo e manutenção. Confirmar direitos antes de incorporar React Bits/Animate UI/catálogos pagos em biblioteca editável; não pressupor MIT irrestrita. MCPs/skills novos continuam opcionais e sujeitos à autorização de instalação.
- [ ] Modelar três cenários de carga (100, 1.000 e 10.000 donos ativos) com visitas e bytes/visita declarados como hipóteses; calcular storage de revisões/derivados, entrega, processamento, suporte e moderação. Não apresentar hipóteses como demanda medida.
- [ ] Comparar storage S3 compatível e transcodificação por processo isolado/serviço, incluindo recuperação, exclusão, cache e custo. Escolher somente com autorização de despesa quando necessária; sem escolha, gate de mídia pesada fica fechado.
- [ ] Registrar política de retenção de arquivos pagos, poster público e tratamento de excesso; impedir exclusão por inadimplência e cobrança automática de tráfego.
- [ ] Definir dispositivos/rede/browser de baseline, arquivos de teste licenciados e critério de saída dos spikes. Resultado: ficha completa e revisável, sem capacidade ficticiamente entregue.

## Tarefa 02 — contrato v2, migração e persistência aditiva

**Depende:** 01 para escopo, sem necessidade de provedor. **Cobre:** MP-01/04/07/20.
**Arquivos:** tipos/profile-input; novos page-document nos dois pacotes; `repositories/profile-page-document.ts`; schema/migração; `profiles-repository.ts`; `profile-diff.ts`.
**Testes:** novos `backend/src/domain/profiles/page-document.spec.ts`, `backend/src/http/profile-page-document.pg.spec.ts`, `frontend/src/features/profiles/page-document.test.ts`.
**Interfaces:** `pageDocumentInput` valida `PageDocument` v2; `toPageDocument(content: LegacyProfileContent): PageDocument` converte sem efeito de persistência; `pageAssetReferences(document: PageDocument): string[]` enumera assets. `LegacyProfileContent` representa a forma atual sem pageDocument; `ProfileContent.pageDocument` é opcional.

- [ ] Criar fixtures v1 com todos os campos atuais e v2 com ordem intercalada; comparar texto, destinos, IDs, visibilidade, principal e sequência antes/depois. Incluir tema legível e ausência de conteúdo.
- [ ] Testar IDs duplicados, referências inválidas, ciclos, profundidade 4, 41 seções, 121 blocos, 501 links e chaves extras; aceitar os valores de fronteira permitidos. RF01: PATCH v1 contra versão v2 retorna conflito e preserva o snapshot.
- [ ] Adicionar armazenamento JSON opcional do documento do rascunho; snapshots/publicações continuam contendo o documento correspondente. Impedir a ressurreição automática de `contentBlocks` legado quando o conteúdo migrado os omite.
- [ ] Expandir leitores antes de habilitar escrita v2; migração ocorre ao salvar explicitamente com expectedVersion. Testar duas abas e rollback para a versão com leitor expandido; nunca fazer rollback para binário que desconhece v2 com escrita ativa.
- [ ] Executar domínio e PG focais. Esperado: round-trip igual para v1, v2 persistido, conflito sem perda e nenhum backfill em leitura.

## Tarefa 03 — apresentação compartilhada, resolução e SEO

**Depende:** 02. **Cobre:** MP-01/04/15/18/19/22.
**Arquivos:** `profile-view.tsx`, `personal-page.module.css`, novos page-document-view/page-section/page-block; `profile-explorer.tsx`, carregadores de público/prévia; `backend/src/use-cases/@Profiles/publication-structure.ts`; consultas públicas em profiles-repository.
**Testes:** `profile-view.test.tsx`, novo `page-document-view.test.tsx`, PG de perfis/busca, `frontend/e2e/profiles.spec.ts` e novo `page-composition.spec.ts`.
**Interfaces:** `PageDocumentView` recebe apresentação já autorizada e mapa de mídia; delega blocos de evento, contato e canais aos componentes atuais. `ProfileView` mantém assinatura externa e seleciona legado/v2. Resolver retorna referências visíveis em ordem estável, com cursores/descritores atuais.

- [ ] Fixar testes v1 antes da mudança; adicionar v2 com seções e grupos reais, link principal, blocos ocultos e templateExample.
- [ ] RF03: grupo com mais itens que uma página, link agendado fora da janela, filtro e cursor ativos. Afirmar que ausência no lote não invalida referência e que só itens visíveis/autorizados chegam ao DOM/rede.
- [ ] Implementar renderer HTML compartilhado, mantendo headings, lang, saídas, data-profile-block-id, marca e estados pending. Não buscar sessão/preço em componentes visuais.
- [ ] Testar público/prévia, JavaScript desligado, canonical/robots e age gate. Nenhum runtime pesado aparece na rede de documento estático.
- [ ] Executar suítes focais e E2E de perfil/busca. Esperado: navegação e SEO preservados, sem duplicar impressões ou carregar todos os itens por conveniência.

## Tarefa 04 — política de capacidades e projeção compatível

**Depende:** 01–03. **Cobre:** MP-16/17/18/25.
**Arquivos:** `profile-plans.ts`, `profile-capability-coverage.ts`, `billing-delivery.ts`, `page-visual-policy.ts` novo; catálogo HTTP; frontend billing-contract/access e tipos de apresentação.
**Testes:** planos existentes; novo `page-visual-policy.spec.ts`; PG de billing/perfis; componentes de paywall.
**Interfaces:** `pageVisualRequirements(document: PageDocument): ProfileCapability[]` identifica requisitos de publicação; `projectPageDocument(document: PageDocument, policy: PageVisualPolicy): PublicPageDocument`. PageVisualPolicy é produzido no servidor por cobertura/entrega e descriptors de mídia, nunca pelo corpo do cliente; separa `draftSave`, `privatePreview`, `upload`, `process`, `publish`, `publicRead` e `ownerRecovery`. Projeção carrega alternativas estáticas autorizadas e explicita recursos indisponíveis.

- [ ] Tabelar Free/Pro/Premium propostos e capacidades antigas imutáveis usando exatamente a spec 10.1/10.2, B01–B18. Testar TEXT/IMAGE/VIDEO migrados mantendo richBlocks, thumbnail/fundo gratuitos e recusa de corpo editorial/vídeo em slides ou CTA de outra capacidade. Rascunho/preview de novos recursos leves salva sem plano; upload/processamento pesado e publicação não são concedidos. Testar configuração sem provedor, recurso ainda não entregue e preço desconhecido sem conceder recurso pago.
- [ ] RF04: cancelar, expirar, restaurar e importar documentos com vídeo/GLB. Afirmar documento preservado, bytes pagos inacessíveis e poster somente quando a política o autoriza.
- [ ] Implementar enum/política e disponibilidade com vendas novas desligadas. Pro não recebe profile.richBlocks ou profile.subdomain por herança acidental; checks são por ação conforme 10.2, sem bloquear autosave de configuração nova leve. Recuperação privada de original pelo dono não depende de assinatura, mas não concede leitura pública ou novo processamento.
- [ ] Adicionar retorno de bloqueio específico para publicação, sem iniciar checkout nem remover dados. Prévia de exemplo paga permanece privada/estática conforme spec.
- [ ] Executar domínio/PG/billing focais. Esperado: o servidor decide; cookie/role/client-side flag não libera recurso; destaque continua separado.

## Tarefa 05 — armazenamento, referências e coleta de órfãos

**Depende:** 01/02/04 e escolha operacional autorizada. **Cobre:** MP-08/10/17/23.
**Arquivos:** novos visual-asset/visual-asset-store, repositories/profile-visual-assets e profile-visual-references, adapter S3, schema/migração, `profile-media.ts`, `profile-revisions.ts`, campanhas/mídia kit; `prune-visual-assets.ts` e worker.
**Testes:** novo `backend/src/repositories/profile-visual-assets.pg.spec.ts`, `backend/src/use-cases/@Profiles/prune-visual-assets.pg.spec.ts`; contratos do adapter com armazenamento descartável.
**Interfaces:** `VisualAssetStore.put/get/head/delete` recebe chave gerada no servidor; `collectVisualReferences(scope): Promise<Set<string>>` reúne rascunho/publicação/revisões/campanhas/mídia kit; `pruneVisualAssets(scope, now)` marca e revalida órfãos após 24 h.

- [ ] Testar asset igual entre dois donos/tenants, checksum duplicado, referências múltiplas, reserva concorrente e storage indisponível. O mesmo hash não permite acesso cruzado.
- [ ] RF02: remover no rascunho, manter publicação/revisão/campanha, aguardar 24 h, reutilizar antes de excluir. Só apagar órfão ainda sem referência; retry é idempotente.
- [ ] Implementar metadados, índices, contagem de bytes/reservas por dono e tenant, porta durável e adapter. Não gravar vídeos no banco ou expor credenciais ao cliente.
- [ ] Testar exclusão/revogação, limpeza de upload interrompido e migração sem bloquear acervo legado excedente. Contar derivados/histórico uma vez por objeto físico.
- [ ] Executar PG/contratos e registrar recuperação de falha entre storage e banco. Esperado: nenhum asset referenciado excluído e nenhum upload órfão contando quota para sempre.

## Tarefa 06 — uploads, processamento e entrega autorizada

**Depende:** 05. **Cobre:** MP-08/09/12/14/23.
**Arquivos:** HTTP visual-assets novo, process-visual-asset, worker, BFF e `frontend/src/features/profiles/visual-assets-api.ts` novo; registro da fila existente. Preparadores por tipo em arquivos focados.
**Testes:** novo `visual-asset.spec.ts`, `profile-visual-assets-routes.pg.spec.ts`, testes de worker/adapter e frontend API; fixtures pequenas reais e licenciadas.
**Interfaces:** begin → upload privado → complete → processing → READY/FAILED. `processVisualAsset(jobId): Promise<void>` idempotente produz derivados e poster; revisão permanece PENDING. API pública resolve somente IDs/revisões publicados e aprovados.

- [ ] Testar MIME mentiroso, dimensão/bomba, checksum divergente, tamanho no limite e um byte acima, arquivo parcial, complete duplicado, expiração de autorização e rejeição de asset de outro perfil.
- [ ] Implementar limites da spec por tipo; comparação da quota antes/depois de upload e reserva transacional para duas abas. Processador isolado tem timeout/memória e não acessa rede fornecida por arquivos.
- [ ] Implementar consulta/remoção, reprocessamento de falha e entrega com Content-Type seguro, cache, Range válido/limitado para áudio/vídeo e recusa de range abusivo. Não persistir URL assinada no documento.
- [ ] Testar indisponibilidade e worker reiniciado; nenhum sucesso falso ou asset público por estar READY.
- [ ] Executar testes HTTP/PG/worker; resultado: arquivos inválidos privados, retries deduplicados e derivados reproduzíveis.

## Tarefa 07 — moderação e substituição de mídia

**Depende:** 02/05/06. **Cobre:** MP-09/18/23.
**Arquivos:** `backend/src/domain/profiles/profile-moderation.ts`, domínio/rotas de content-review, repositórios de aprovação, integração administrativa e notificações existentes; UI de biblioteca/revisão do perfil.
**Testes:** profile-moderation/content-reviews existentes e novos cenários PG de mídia visual; E2E de revisão.
**Interfaces:** snapshot inclui texto v2 e asset IDs; decisão de mídia é independente de processamento e não concede direitos de plano. Publicação resolve a mídia aprovada correspondente; substituição pendente conserva versão anterior.

- [ ] Criar cenário aprovado A, substituto B pendente/rejeitado, troca de tema e novo destino. Só conteúdo efetivamente alterado segue a revisão adequada; aparência pura não gera análise textual artificial.
- [ ] Acrescentar mídias visuais ao fluxo existente com motivo privado, denúncia e retirada. Não reutilizar aprovação do Link do catálogo para upload pessoal diferente.
- [ ] Testar aprovação por admin/moderação atual, duplicidade de decisão, conta suspensa, outro tenant e tentativa de servir B diretamente pela URL.
- [ ] Percorrer fila real, rejeição e recurso aplicável com teclado; mostrar estado correto no editor e conservar A público.
- [ ] Executar domínio/PG/E2E de revisão e registrar limites da análise automática de vídeo/3D. Nenhuma promessa de detecção universal.

## Tarefa 08 — biblioteca de imagens, fundos e cards

**Depende:** 03/05–07. **Cobre:** MP-05 B01/B04/B09/B13, MP-08/11/23.
**Arquivos:** novos `visual-asset-library.tsx`, `page-image-controls.tsx`; `profile-appearance-editor.tsx`, card em blocks, CSS Modules; integração de mídia aprovada do catálogo.
**Testes:** novos biblioteca/card/image-controls, `frontend/e2e/page-media.spec.ts`; PG do vínculo de card.
**Interfaces:** seleção retorna assetId autorizado e transformações não destrutivas; renderer recebe variantes e disponibilidade do servidor. Remover referência e excluir arquivo são ações distintas.

- [ ] Testar imagem própria, mídia aprovada do catálogo, erro 404, ratio extremo, alt longo, foco mobile/desktop e remoção sem apagar histórico.
- [ ] Implementar envio/reuso, filtro por finalidade, estado, uso e tamanho; recorte, focal point, overlay e fallback. Arquivo original não é regravado por recorte de um card.
- [ ] Implementar compacto/thumbnail/capa/card grande sem mudar destination, primaryItemId, eventos ou superfície de métricas.
- [ ] Comparar LiquidLens/efeitos locais com efeito pequeno Magic UI gratuito MIT, como Shine Border; copiar somente se reduzir trabalho, preservando licença e adaptando CSS Modules. Não trazer next-themes, Tailwind ou outro componente de botão/dialog para esse fim.
- [ ] Testar preview/público com substituição pendente, rede lenta, imagens desligadas e marca/foco sobre fundos extremos.
- [ ] Executar testes/E2E e inspeção 390×844/1440×900/320 px; imagens não devem esconder o texto ou causar salto de layout.

## Tarefa 09 — catálogo de 20 estilos e aparência por camadas

**Depende:** 02–04/08. **Cobre:** MP-02/03/11/18/24.
**Arquivos:** novos page-design/page-design-catalog dos dois pacotes, HTTP design-catalog; editor de aparência e CSS por tema local; templates atuais; manifesto de fontes/assets.
**Testes:** `profile-appearance.test.ts`, novos catálogo/backend schema; `frontend/e2e/page-themes.spec.ts` registrado nos projetos desktop/mobile.
**Interfaces:** catálogo entrega ID/versão, defaults, suporte, previews, capacidades e licença; `applyPageTheme(document, theme, layers): PageDocument` preserva conteúdo e overrides fora das layers.

- [ ] Preparar fichas e comparação visual dos 20 estilos com os mesmos conteúdos; preservar seis temas atuais. Cada ficha decide tipo, grid, card, grafismo, fundo e comportamento mobile.
- [ ] Testar todos os IDs da spec, round-trip, versão desconhecida, aplica só fundo/texto/cards e conteúdo/URL/visibilidade inalterados.
- [ ] Implementar sólidos, 2–6 stops de gradiente, mesh até 8 pontos, padrões e até quatro camadas; controles avançados tipados e fallback opaco. Fontes somente quando usadas.
- [ ] Para fundos animados, produzir spike Paper Shaders versus CSS na mesma fixture; registrar licença/NOTICE, versão exata, pixels, bytes, startup e pausa. O ajuste mesh de até oito pontos continua contrato próprio: se a API do candidato não o representar, conservar alternativa CSS ou revisar a spec com evidência; não simular controle sem efeito. Usar poster/CSS real sem GPU, nunca apenas speed zero. Implementação animada só após infraestrutura de movimento/GPU das tarefas 14/15, sem bloquear bases estáticas desta tarefa.
- [ ] Capturar 20 temas em desktop/mobile, com conteúdo curto/longo e sem mídia; revisar diferenças e legibilidade. Axe complementa contraste manual sobre fundos reais.
- [ ] Executar domínio/componentes/E2E e validar fichas. Não aprovar 20 variações que troquem apenas cor; estilos ricos precisam das formas/materiais prometidos.

## Tarefa 10 — compositor, layouts e recuperação

**Depende:** 02–04/09. **Cobre:** MP-04/06/07/24.
**Arquivos:** novos page-composer/page-inspector/page-block-library/use-page-history, `profile-editor.tsx`, `use-profile-draft.ts`, profile-editor-section/toolbar e rotas existentes; CSS Modules.
**Testes:** use-profile-draft existente, novos histórico/compositor/inspector; page-composition E2E.
**Interfaces:** ações tipadas sobre PageDocument; `usePageHistory(initialDocument)` oferece apply/undo/redo/reset; `useProfileDraft` continua único writer e autoridade da versão. Seleção e viewport são estado de editor, não conteúdo público.

- [ ] Testar adicionar/mover/duplicar/remover/ocultar/bloquear, 100 operações, digitação coalescida, erro/offline e conflito com recuperação antes de recarregar. Undo não reaplica resposta antiga do autosave.
- [ ] Implementar árvore e seleção direta, inspetor contextual, modos testar/editar e alternativas de clique/teclado ao drag. Preservar workspace switch guard e flush antes de publicar.
- [ ] Implementar coluna/grade/bento/split/editorial/faixas, trilhas 12/8/4, overrides e ordem semântica única; decoração não captura foco/clique. Ao colapsar, seguir a ordem mostrada no editor.
- [ ] Testar mobile com painéis alternados, zoom 200%, fonte longa, 120 blocos e 500 links paginados. Não renderizar centenas de previews com runtimes ativos.
- [ ] Executar componentes/E2E e inspeção real por teclado/toque. Resultado: editor utilizável e recuperação comprovada, sem precisar do mouse para ordenar.

## Tarefa 11 — galeria e carrossel funcionais

**Depende:** 08/10 e política 04. **Cobre:** MP-05 B02/B05/B06, MP-13/19/24.
**Arquivos:** novos `blocks/page-gallery.tsx`, `page-carousel.tsx`, editors locais; reusar OverlayDialog para lightbox; renderer e resolução de grupos.
**Testes:** novos galeria/carrossel, `frontend/e2e/page-widgets.spec.ts`, PG de referências.
**Interfaces:** galeria referencia assets; carrossel referencia assets ou IDs canônicos de links; nenhum clone de slide cria novo link/medição. Fonte vazia/filtrada retorna estado definido.

- [ ] RF03: itens entre páginas, filtrados, ocultos e agendados; confirmar que carrossel não duplica registros, não ressuscita conteúdo oculto e preserva cursor.
- [ ] Implementar grade/lightbox com alt/legenda, foco e fechamento; carrossel manual com swipe/botões e lista HTML sem JS.
- [ ] Comparar scroll-snap com Embla estável 8.6.0 (ou estável reconfirmada na execução) na mesma fixture; preferir Embla se gestos/arraste/loop justificarem o motor. Integrar diretamente com CSS Modules e controles existentes, sem copiar wrapper Tailwind. Verificar listeners, itens ocultos, largura variável e cleanup; a biblioteca não resolve automaticamente acessibilidade ou métricas.
- [ ] Testar 0/1/20/21 slides e 0/50/51 imagens. Sem autoplay com um slide; item falho mostra fallback e não trava navegação.
- [ ] Autoplay só após suporte 14: >=5 s, pausa explícita, foco/hover, reduced-motion e leitores de tela. Slide oculto não contém foco alcançável ou impressão nova por clone.
- [ ] Executar componente/E2E/teclado e comparar métricas com fixture real; botões não podem ser apenas decoração.

## Tarefa 12 — componentes de apresentação e negócio

**Depende:** 07/10. **Cobre:** MP-05 B03/B09/B10/B11/B12/B13/B14/B15/B16, MP-18/19.
**Arquivos:** novos componentes focados em blocks para rich-text, CTA, FAQ, vitrine, depoimentos, decoração e navegação; integrar contact-forms/profile-events/profile-channels existentes; domínio/schema correspondente.
**Testes:** domínio dos blocos, componentes e page-widgets; regressão contato/eventos/canais.
**Interfaces:** AST de texto em allowlist; URL usa validador existente; vitrine não calcula checkout; contato/evento/canal mantém descriptor e autorização atuais. Novos tipos Pro não reutilizam payload legado richBlocks sem verificar a capacidade desse payload.

- [ ] Definir fixture válida/inválida e casos vazio/erro para cada tipo B03/B09–B16. Fixar limites da spec 10.1 para CTA, FAQ, depoimentos e vitrine; texto malicioso, link com credencial, depoimento vazio, preço/moeda e countdown de evento expirado têm resultado explícito.
- [ ] Implementar edição, apresentação, fallback, ocultação e remoção por componente. Countdown usa data real do evento e relógio estável, nunca reinicia por visita.
- [ ] Testar FAQ com teclado, âncoras com heading correto, CTA sem URL e vitrine sem compra interna. Depoimentos são dados do dono, sem selo falso.
- [ ] Reutilizar campos/controle de consentimento e permissões existentes em formulário/provider; não iniciar chamadas externas ao abrir o editor ou carregar preview estático.
- [ ] Executar domínio/PG quando houver dados, componentes e E2E afetados. Registrar uma linha Bnn com editor+público+teste, sem declarar biblioteca completa por existência do schema.

## Tarefa 13 — vídeo, áudio e embeds de conteúdo

**Depende:** 06–08/10/12; provedor/processamento aprovados. **Cobre:** MP-05 B07/B08/B14, MP-12/18/23/24.
**Arquivos:** preparadores de vídeo/áudio/legendas, process-visual-asset, componentes `page-video.tsx`, `page-audio.tsx`, content-video existente, provider catalog e editor.
**Testes:** parser/limites, PG de mídia/range, componentes e page-media E2E.
**Interfaces:** descritores fornecem poster, fontes suportadas, duração e tracks; legenda WebVTT validada, sem HTML executável. Providers existentes continuam click-to-load e novos precisam de allowlist e política de consentimento.

- [ ] Testar MP4/WebM/MP3/M4A/OGG reais, codec não suportado, arquivo truncado, duração/tamanho excedidos, legenda inválida e processamento interrompido.
- [ ] Implementar transcodificação isolada idempotente, tracks e transcrição; vídeo falado exige alternativa na publicação conforme spec. Não transcodificar em request síncrona.
- [ ] Preservar YouTube/Vimeo validados; acrescentar áudio embed por provider documentado. Autoplay sonoro permanece desabilitado; erro do provider não bloqueia links.
- [ ] Testar controles, pausa, Range, Safari, rede lenta e consentimento negado; sem requisição ao terceiro antes da ação/aceite exigido.
- [ ] Executar PG/componentes/E2E e amostra física; resultado inclui reprodução e recuperação, não apenas thumbnail.

## Tarefa 14 — sistema de movimento e animações

**Depende:** 10–12. **Cobre:** MP-13/15/18/24.
**Arquivos:** novos schema/controller/host em visual-effects, controles de movimento e CSS locais; `page-carousel.tsx`; sem provider global novo.
**Testes:** validação de sequências, componentes motion/carrossel e `frontend/e2e/page-motion.spec.ts`.
**Interfaces:** MotionConfig validado pela spec; host recebe target IDs e política do visitante, retorna cleanup/pausa. Motion core é candidata para DOM avançado somente se spike demonstrar vantagem sobre CSS/WAAPI; runtime de asset 2D permanece decisão separada e excepcional.

- [ ] Testar 4/5 ações, 8/9 sequências, duração 100–2000 ms, atraso até 2000 ms, loop >=4 s e autoplay >=5 s; chaves/código arbitrário rejeitados.
- [ ] Comparar CSS/WAAPI e Motion core para layout/entrada/saída, carga seletiva e reduced-motion, registrando bytes e perfil real. AI Kit oficial pode auxiliar consulta; não exigir assinatura Motion+ nem incorporar exemplos pagos como se fossem MIT. Evitar instalar Anime/GSAP e Motion para o mesmo caso.
- [ ] Implementar presets e inspeção de propriedades, simulação de gatilho e pausa geral. Hover apenas com media query apropriada; foco não depende de deslocamento.
- [ ] Testar reduced-motion/transparency, aba oculta, elemento fora da visão, desmontagem e reentrada. Sem timers/observers vazando após trocar tema.
- [ ] Integrar autoplay de 11 com pausa persistente da visita e sem foco roubado; sem JS continua lista/grade.
- [ ] Executar testes/E2E, inspecionar animação em velocidade normal/lenta e comparar perfil de runtime. Não incluir biblioteca de animação em documento sem esse asset.

## Tarefa 15 — spike de runtime e biblioteca 3D pronta

**Depende:** 01/04/06/09/14. **Cobre:** MP-14/15/24.
**Arquivos:** ADR de escolha; novos scene schema/catalog, visual-effects/scene-host, scene-runtime escolhido, manifestos e posters. Novos pacotes só após decisão registrada/autorizada no escopo de execução.
**Testes:** scene-config, scene-host e novo `frontend/e2e/page-3d.spec.ts` com fixtures locais.
**Interfaces:** SceneConfig referencia cena/versão e parâmetros permitidos; host gerencia um canvas ativo e fallback. Renderer textual não importa o motor diretamente.

- [ ] Comparar Three direto, Three via Fiber 9/Drei e model-viewer na mesma amostra de objeto/fundo conforme suporte, registrando peso/requests/decoders, contexto perdido, startup e custo de manutenção; escolher um caminho 3D. Não usar Fiber 8 com React 19 nem alpha por padrão. Comparar Rive/dotLottie apenas se um asset 2D concreto exigir runtime.
- [ ] Validar seis cenas da spec, posters, licença e orçamento; avaliar assets CC0 Poly Haven/Kenney e helpers Drei para carga/enquadramento/ambiente/flutuação antes de modelar/reimplementar equivalentes. Hospedar arquivos permitidos sem CDN implícito. Spline MCP/skill e Blender MCP comunitário são autoria opcional; não instalar ou contratar para cumprir uma dependência implícita.
- [ ] Implementar host com lazy load, um canvas GPU ativo compartilhado com Paper Shaders, DPR <=1,5 e alvo 30 fps; ao ativar objeto, usar poster do fundo e suspender/liberar shader anterior. Pausa offscreen/hidden, cleanup e poster em falha/reduced-motion; previews são thumbnails. Bloco interativo preserva scroll/touch-action vertical.
- [ ] Testar sem GPU/sem JS, bloqueio de decoder, mudança de tema, duas cenas concorrentes, evento de context lost e suspensão. Links/CTA seguem funcionando.
- [ ] Executar componente/E2E e benchmark em Android intermediário/Safari físico antes de marcar pronto. Registrar números medidos sem extrapolar a todos os dispositivos.

## Tarefa 16 — GLB próprio e vídeo de fundo

**Depende:** 06/07/13/15. **Cobre:** MP-08/09/12/14/23.
**Arquivos:** preparadores GLB/background-video, pipeline, scene inspector, background controls e catálogo; schema/boundaries de mídia.
**Testes:** novo `visual-model.spec.ts`, PG pipeline, page-3d/page-media E2E.
**Interfaces:** validação Khronos mais inspeção de URI/estatísticas e política de extensão; processador produz GLB aprovado tecnicamente, poster e manifesto. Cliente escolhe câmera/luz/material/animação suportada sem injetar código.

- [ ] RF05: GLB válido com URI remota, data URI abusiva, NaN, extensões desconhecidas, textura enorme, excesso de polígonos/draw calls, zip disfarçado e timeout. Nenhuma rede externa iniciada pelo arquivo.
- [ ] Implementar entrada até 20 MiB e saída até 8 MiB/100 mil triângulos/60 draw calls estimadas/texturas 2048 px, ou limites revisados no spike. Rejeição explica como exportar versão compatível sem apagar o upload válido anterior.
- [ ] Implementar enquadramento/escala/rotação/luz e animação nativa validada; modelo significativo exige descrição e alternativa. Aprovação técnica não marca conteúdo APPROVED automaticamente.
- [ ] Implementar vídeo decorativo até 50 MiB/30 s, derivado <=8 MiB/720p/30 fps, sempre mudo, com poster/pausa e sem consumo simultâneo indiscriminado com 3D.
- [ ] Executar pipeline/PG/E2E físico e registrar autoria/licença, moderabilidade e remoção. Resultado inclui upload do dono e reprodução real, não apenas cenas de catálogo.

## Tarefa 17 — kit de marca, temas e componentes salvos

**Depende:** 09/10/12/04. **Cobre:** MP-03/21/23.
**Arquivos:** page-preset, profile-page-presets, rotas privadas; page-brand-kit/page-presets; suporte de fonte em pipeline após decisão de dependência.
**Testes:** preset schema, novo `profile-page-presets.pg.spec.ts`, componentes e E2E de biblioteca.
**Interfaces:** presets versionados por dono/tenant; POST `/me/profile/page-presets`, GET coleção, PATCH/DELETE `/:id` com expectedVersion. Aplicação copia configuração e gera IDs locais; não altera instâncias já publicadas.

- [ ] Testar preset de tema por camadas, componente com mídia, exclusão referenciada, outro dono/tenant e atualização de versão. Nunca carregar ACL, contato privado ou token do preset.
- [ ] Implementar favoritos, salvar/reaplicar, duplicar e kit de paleta/tipos. Preset referenciado preserva asset necessário sem duplicar arquivo.
- [ ] Implementar WOFF2 próprio até 500 KiB e duas famílias/página, com metadados/licença declarada, validação e fallback; nunca CSS remoto.
- [ ] Testar conflito, fonte inválida, falta de asset e preset pago sem cobertura, oferecendo prévia/bloqueio correto.
- [ ] Executar domínio/PG/componentes/E2E. Não criar marketplace público nesta tarefa.

## Tarefa 18 — idiomas, campanhas, mídia kit, backup e diagnóstico

**Depende:** 02–17 conforme tipo integrado. **Cobre:** MP-05 B15/B18, MP-19/20/22.
**Arquivos:** `profile-translations.ts`, `profile-moderation.ts`, `profile-export.ts`, `profile-backup.ts`, `profile-revisions.ts`, templates/campaigns/media-kits; frontend features correspondentes, share-kit e diagnóstico existentes.
**Testes:** specs existentes de idiomas/export/backup/histórico/campanhas/media-kit/share-kit e novos casos v2.
**Interfaces:** export schemaVersion 2 aceita leitor/importador v1/v2; manifesto explicita mídia não incluída e referências internas remapeadas. Campanha usa revisão de origem; mídia kit mantém projeção própria; tradução inclui textos, legendas e alt de blocos novos.

- [ ] Testar restauração v1 e v2, importar com slug atual, remapear IDs/blocos/grupos/âncoras e substituir mídia ausente por placeholder privado. Arquivo não importa assinatura/permissão/contato/token.
- [ ] Testar campanhas com revisão congelada e asset em uso, mídia kit com campos privados sentinela, busca/paginação e redes/canais/eventos após layout novo.
- [ ] Integrar templates por atividade com estilo independente; share-kit usa poster/composição estática explicitamente descrita, sem anunciar captura perfeita de cena ao vivo.
- [ ] Integrar diagnóstico com problemas acionáveis de asset, conteúdo, contraste e peso, sem score fabricado ou promessa de conversão. Traduzir B18 com fallback atual e moderação do texto novo.
- [ ] Executar domínio/PG/componentes/E2E afetados. Resultado: nenhuma superfície é esquecida por compartilhar ProfileView.

## Tarefa 19 — oferta comercial e ciclo de vida novos

**Depende:** 04 e todos os recursos que se pretende vender; decisão comercial explícita de 01. **Cobre:** MP-16/17/25.
**Arquivos:** profile-plans/billing-delivery/profile-billing-repository e admin/billing frontend; versões de plano e migrações apenas se necessárias. Não alterar Order/Promotion por efeito lateral.
**Testes:** planos, profile-billing PG e `frontend/e2e/profile-billing.spec.ts`, novo cenário visual pago.
**Interfaces:** catálogo real do servidor decide recursos, preço e readiness; PlanVersion nova não muta versão já contratada. Aplicar projeção 04 na leitura pública e checks de upload/save/publish.

- [ ] Aprovar matriz, quotas, retenção de mídia e preços com custo medido; registrar mudança deliberada de condições e comunicação. Manter aparência e histórico antigos gratuitos e marca permanente.
- [ ] RF04: ativo/pending/past_due com saldo confirmado/cancelado/expirado/preço desconhecido/recurso não entregue. Verificar ausência de capacidade pelo retorno do checkout, webhook duplicado ou metadata.
- [ ] Criar novas versões de oferta sem habilitar venda automaticamente; servidor recusa benefício não entregue. Não prometer upgrade imediato se a regra atual agenda troca de ciclo.
- [ ] Testar downgrade: preservar documento e acervo, servir apenas projeção autorizada, bloquear bytes pagos e permitir exportar/remover/voltar à versão compatível. Nenhuma cobrança por excedente.
- [ ] Executar billing completo e regressão de destaque. Habilitação comercial remota depende de pedido separado e não é feita por este plano automaticamente.

## Tarefa 20 — validação integrada, operação e reversão

**Depende:** todas as anteriores para declarar programa completo. **Cobre:** MP-01–MP-25.
**Arquivos:** configs de teste, novas suítes page-*, docs de evidência e contrato aprovado; Storybook existente quando útil. Nenhum update de baseline sem inspeção.
**Interfaces:** matriz MP com teste/captura/ambiente/resultado/limite e matriz B01–B18; relatório de operação e release por onda.

- [ ] Registrar todas as novas suítes nos projetos features/features-mobile e fixtures do harness. Antes de E2E, ler global-setup/global-teardown/runtime e run-lease atuais; conferir portas e nomes de containers próprios. Bases atuais 3000/3333/4099/4443/5433/6380 podem receber offset; nunca matar processo alheio.
- [ ] Por pacote alterado, executar lint, typecheck, unitários afetados e build. Backend: `npm run lint`, `npm run typecheck`, `npm test -- <arquivos focais>`, `npm run test:pg -- <arquivos focais>`, `npm run build`. Frontend: mesmos checks compatíveis com scripts atuais e `npm run test:e2e -- <suíte> --project=features`/`--project=features-mobile`. Confirmar que os argumentos realmente selecionaram os arquivos pretendidos; PG usa banco descartável, nunca produção.
- [ ] Regressão integrada mínima: profiles, profile-history, profile-billing, profile-search, profile-templates, profile-export, campaign-pages, media-kit, share-kit, profile-languages, profile-team/workspace-team, content-reviews, contact-forms/profile-events/profile-channels e novas page-*; acrescentar suite atingida por mudança efetiva.
- [ ] Inspecionar 390×844 e 1440×900, 320/768/1280 px, zoom 200%, teclado/foco, contraste, toque, reduced-motion/transparency/forced-colors, vídeo/modelo em aparelho físico, sem JS, sem GPU, offline/erro e consentimento negado. Revisar capturas esperada/atual/diff; não aumentar tolerância para ocultar regressão.
- [ ] Medir cenário estático e pesado na mesma condição: bytes por tipo, fontes/JS, requests externos, frame time e Web Vitals de laboratório. Campo p75 só após dados reais permitidos; não marcar acessibilidade total ou produção validada a partir do laboratório.
- [ ] Exercitar reprocessamento, rejeição/denúncia/retirada, expiração de upload, quota, restauração de storage/banco e coleta de órfãos com falha/retry. Documentar runbook sem credenciais, licenças e flags de cada onda.
- [ ] Revisar diff sem tocar mudanças alheias; atualizar Graphify incrementalmente apenas após código relevante, local/code-only, confirmando consumidores atuais. Grafo não valida CSS/semântica/mídia.
- [ ] Reversão: desligar criação de conteúdo/efeito novo, manter leitor v2 e dados/URLs existentes, usar posters/projeção segura. Não fazer down migration destrutiva nem voltar a binário v1 incapaz de ler documentos salvos. Novo deploy, commit ou push só com autorização específica.

## Matriz de cobertura e conclusão

| Critérios | Tarefas primárias |
| --- | --- |
| MP-01 | 02/03 |
| MP-02 | 09 |
| MP-03 | 09/17 |
| MP-04 | 02/03/10 |
| MP-05 | B01/B04/B09/B13: 08/12; B02/B05/B06: 11; B03/B10/B11/B12/B14/B15/B16: 12/13/18; B07/B08: 13; B17/B18: 15/16/18 |
| MP-06 | 10 |
| MP-07 | 02/10 |
| MP-08 | 05/06/08/16 |
| MP-09 | 06/07/16 |
| MP-10 | 05 |
| MP-11 | 08/09 |
| MP-12 | 06/13/16 |
| MP-13 | 11/14 |
| MP-14 | 06/15/16 |
| MP-15 | 03/14/15 |
| MP-16 | 04/19 |
| MP-17 | 04/05/19 |
| MP-18 | 03/04/07/12/14/20 |
| MP-19 | 03/11/12/18 |
| MP-20 | 02/18 |
| MP-21 | 17 |
| MP-22 | 03/18 |
| MP-23 | 01/05–08/13/16/17/20 |
| MP-24 | 01/08–16/20 |
| MP-25 | 01/04/19 |

Concluído significa evidências MP e B registradas, 20 estilos inspecionados, ambos pacotes verificados e condições operacionais/comerciais atendidas no ambiente declarado. Não somar testes sobrepostos como casos únicos. Um recurso pode estar validado localmente e indisponível comercialmente; registrar os dois estados.

## Revisão deste plano documental

Cobertura confrontada com spec e pesquisa. Não há passos de instalação, implementação ou teste marcados como executados. Nomes novos são propostas de interface; tarefa 02 fixa o contrato e as tarefas consumidoras usam esse mesmo contrato. Gates que dependem de custo, licenças ou regra comercial exigem decisão registrada; não podem ser “resolvidos” com um mock e declarados prontos em produção.

A revisão independente da spec motivou o mapeamento B01–B18 e a separação por ação na política comercial. A tarefa 04 foi atualizada para impedir tanto a publicação indevida quanto o bloqueio incorreto de autosave de configurações leves novas. A autorrevisão conferiu os 25 critérios MP e sua ligação com tarefas; os cinco casos de Review Focus possuem oráculos nas tarefas responsáveis.

Esta etapa entrega pesquisa, spec e plano. O próximo pedido deve indicar ajustes ou autorizar execução. A escolha de execução por agentes ou nativa não foi presumida; a revisão independente da spec não autoriza agentes a implementar.
