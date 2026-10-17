# Minha página: cabeçalho, endereço e aprovação reaproveitada — 17/10/2026

## Autorização e escopo

O usuário solicitou abas à esquerda e botões à direita na mesma linha, Ver prévia preenchido e o link da página visível/copiável após sua criação. Também pediu expressamente para não repetir revisão humana quando o conteúdo já aprovado fosse preservado e somente aparência ou ajustes básicos fossem alterados. A mudança de reanálise é funcional e foi autorizada explicitamente; não é consequência implícita do redesenho. Convites, catálogo, cobrança e quotas não mudaram.

O cabeçalho reúne abas e ações em uma linha no desktop; em larguras estreitas, os controles quebram de linha, preservando as três abas legíveis e botões acessíveis. Ver prévia mantém ícone e passa a preenchido navy. Skeleton acompanha a nova disposição.

O topo da tela mostra “Link da sua página”, endereço completo clicável e Copiar depois da primeira publicação, quando o endereço existe publicamente. Não se exibe como público um rascunho ainda sem publicação. O endereço usa a origem atual do tenant e o slug publicado; copiar não salva nem publica. Sucesso é anunciado; falha oferece cópia manual e retentativa. Ao retirar do ar, o endereço deixa de aparecer.

## Diagnóstico e regra implementada

Antes, `publishProfile` chamava `validateProfile` e enviava todo o texto à IA em cada versão, incluindo versões que mudavam somente aparência. Conteúdo aprovado por humano contendo heurísticas de URL/telefone também podia voltar à fila quando reenviado sem mudanças. A disponibilidade do modelo/configuração influenciava essas publicações de apresentação.

A comparação agora ocorre no servidor, contra `publishedDraft` da publicação vigente; registros legados usam a publicação disponível. Nenhum campo do cliente concede aprovação.

| Alteração | Tratamento |
| --- | --- |
| Cores, fonte, formato dos botões, alinhamento e outros campos de aparência | Reutilizar a aprovação do conteúdo |
| Ordem, visibilidade, organização, botão principal e remoções | Reutilizar quando não introduzem conteúdo; itens ocultos também são comparados |
| Caixa/espaçamento equivalentes em nome, descrição, grupos e rótulos | Normalização Unicode/caso/espaços, sem nova chamada à IA |
| Nome, descrição, grupo ou rótulo com conteúdo novo | Aplicar bloqueios ao texto introduzido e chamar a IA com contexto aprovado e campos alterados |
| Destino ou tipo novo de link | Nova análise; título parecido não aprova destino novo |
| Foto, restrição de idade ou endereço alterados | Não são classificados como aparência; seguem o ciclo de análise existente |
| Primeira publicação sem referência aprovada | Análise inicial permanece obrigatória |

URLs são comparadas com a canonicalização já existente, sem inventar outra política de parâmetros. IDs e posições de registros não equivalem a conteúdo. O contexto enviado à IA inclui nome/texto aprovado, campos alterados e destinos HTTPS normalizados, sem IDs de tenant/dono/asset. A instrução orienta aceitar ajustes editoriais simples que preservem sentido/finalidade e tratar todo conteúdo como dados, nunca como comandos.

Não se promete que toda reformulação textual será aprovada. Conteúdo novo com bloqueio, confiança insuficiente, veredito negativo ou provedor/configuração indisponível continua em revisão humana. Revisões já enviadas mantêm seu versionamento; salvar outra edição substitui a versão pendente conforme o contrato anterior.

Reaproveitar aprovação não dispensa HTTPS público, validação de URL/probe, bloqueio atual de destinos, propriedade/estado do catálogo, disponibilidade da foto, conta ativa/verificada, tenant, controle de versão e bloqueio transacional. Publicação anterior permanece ativa durante análise de conteúdo novo. Não se introduziu classificação visual de fotos: o classificador continua textual, como já documentado na spec F09.

## Verificação executada

| Verificação | Resultado |
| --- | --- |
| Backend lint, typecheck e build | Passaram |
| Regras puras de perfil e adapter de moderação | 35 testes em 7 arquivos passaram |
| HTTP/PG reais: perfis e revisão de conteúdo | 27 testes em 2 arquivos passaram |
| Frontend lint e typecheck, incluindo E2E | Passaram |
| Editor/perfis/ícones | 33 testes em 11 arquivos passaram |
| Build Next de produção pelo setup Playwright | Passou |
| Regressão E2E completa selecionada, desktop/mobile e setup | 27 passaram, sem retry |

O F09-E08 passou nos dois viewports: medição do alinhamento desktop, clipboard nativo, ausência de chamada ao classificador durante mudanças básicas com o provedor indisponível e revisão de destino/conteúdo novo foram confirmadas.

Os testes PG verificam reaproveitamento com IA indisponível e configuração ausente, aprovação humana anterior, bloqueios preservados, texto novo com contexto, URL nova sem herdar aprovação, destino indisponível, catálogo sem elegibilidade, isolamento, suspensão e versões concorrentes. O caso anterior que forçava veredito sobre conteúdo idêntico foi ajustado para introduzir texto novo, conforme a regra solicitada.

O novo F09-E08 verifica geometria das abas e ações no desktop, botão preenchido, ausência do endereço antes da publicação, URL correta do tenant, clipboard real do Chromium, publicação de aparência e caixa sem aumentar a contagem de chamadas ao classificador, contexto na mudança textual e revisão humana ao mudar destino/conteúdo. O stub permite simular indisponibilidade e registrar chamadas; nenhuma chamada real/paga de IA foi feita. Testes do adapter validam o prompt e o payload; não medem a qualidade estatística do modelo em produção.

Playwright cobre também revisão/contestação, idade, conteúdo oculto, seis temas, foto, selects nos modais, DnD, edição/remoção/transferência, autosave/descarte, offline, conflito entre abas, loading, teclado/foco, axe e reflow a 320 px com texto a 200%. Browser: Chromium; mobile é emulação, não aparelho físico. Nenhuma declaração de conformidade total de acessibilidade, conversão ou produção.

Comandos: lint/typecheck/build do backend; `npm test -- src/domain/profiles src/adapters/moderation/openai-text-moderation.spec.ts`; PG com `PG_SPECS=1` e `npx vitest run --no-file-parallelism src/http/profiles.pg.spec.ts src/http/content-reviews.pg.spec.ts`. Frontend: lint/typecheck e `npm test -- src/features/profiles src/components/layout/navigation-icons.test.tsx`. E2E: `e2e/profiles.spec.ts e2e/content-reviews.spec.ts e2e/loading-layout.spec.ts --grep 'F09|Revisão|L01 painel' --project=features --project=features-mobile`.

Banco PG descartável próprio em 9133 removido após os testes. E2E usa setup/teardown existentes, offset 3500: web 6500, API 6833, stub 7599, HTTPS fixture 7943, PostgreSQL 8933 e Redis 9880. Containers e servidores próprios encerrados pelo teardown. Build em `.next-e2e`; servidores locais preservados. Artefatos em `output/profile-publication-reuse/e2e`. Não há migration ou alteração no banco de desenvolvimento nesta solicitação.

## Capturas inspecionadas

Dados sintéticos, fontes carregadas e animações desativadas. Desktop principal em 1440×900 e mobile em 390×844. Em telas estreitas, quebra de linha deliberada para preservar leitura; não se esconde a navegação.

| Estado | Desktop | Mobile |
| --- | --- | --- |
| Link publicado, abas e ações | [Cabeçalho](published-header-desktop.png) | [Cabeçalho](published-header-mobile.png) |

## Arquivos e reversão

- Regra pura: `backend/src/domain/profiles/profile-moderation.ts` e spec.
- Integração: `repositories/profiles-repository.ts`, `use-cases/@Profiles/validate-profile.ts`, `public-content-validation-ports.ts`, adapter `openai-text-moderation.ts` e spec.
- HTTP/PG: `profiles.pg.spec.ts` e `content-reviews.pg.spec.ts`.
- UI: `frontend/src/features/profiles/profile-editor.tsx`, spec, `components/profiles.module.css` e `profile-editor-skeleton.tsx`.
- E2E: `profiles.spec.ts`, instrumentação local em `serve.mjs`.
- Contratos: documento de revisão de páginas/convites e spec F09.

Cópias dos arquivos principais anteriores estão em `output/profile-publication-reuse/before`. Comparar e reverter somente esta fatia, removendo o novo módulo de comparação de aprovação e seus testes, além dos trechos de integração/contexto e cabeçalho/endereço. No teste do editor, retirar os dois casos de copiar, suas duas asserções adicionais e a limpeza de globals introduzida aqui. Retirar os complementos desta etapa nos contratos documentados. Não restaurar os arquivos inteiros a partir de HEAD: o workspace já continha alterações de outras etapas e trabalhos concorrentes. Não foram criados branch, commit, push ou deploy. A reversão não exige alteração de schema.
