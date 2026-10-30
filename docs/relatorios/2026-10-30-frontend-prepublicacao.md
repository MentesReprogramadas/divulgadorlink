# Frontend — revisão anterior à publicação, 30/10/2026

## Estado revisado

Revisados o lote pendente de configurações Shopee, escolha da fonte da coleta, identificação do provedor nos produtos, política desejada de grupos e mensagens de erro/pendência. Mantidos os contratos de backend, confirmação de envios, descarte manual, consentimento, atribuição, dados do tenant e regras comerciais.

Encontrada a LP longa na rota principal `/ofertas/pets`. Corrigida para o pedido atual: uma imagem, o título **Achadinhos Pet** e um botão **Entrar no grupo grátis** com destino `/ofertas/entrar/pets`. Shell compartilhado e metadados/canonical preservados. Sem FAQ, benefícios, seções adicionais, contadores ou CTA repetido.

O avatar foi trocado pelo cartoon aprovado já existente em `C:/VSCODE/achadinhos-pet-lp/dist/assets/avatar-cartoon-v2.webp`. Apenas leitura/cópia desse asset; nenhum arquivo do projeto separado foi editado ou reincorporado. Arquivo público final: `frontend/public/ofertas/pets/avatar.webp`, 512 × 512, 50.804 bytes, SHA-256 `2A43C1D5BBA9367B6A8822087A600AF31D792E2593333BCE0BCF2A2CEA643705`.

## Correções desta revisão

- `features/affiliates/components/pets-landing.tsx` e `.module.css`: versão simples solicitada.
- `e2e/pets-landing.spec.ts`: um CTA, ausência de FAQ/seções extras, ativação por Enter, SSR, imagem e largura 320px.
- `e2e/affiliates-ui.spec.ts`: fixture da nova política de grupos e expectativa do último controle no ciclo de foco do dialog. O botão final mudou de `Continuar para WhatsApp` para `Salvar política dos grupos`; a verificação continua exigindo contenção e retorno do foco.

## Verificações

`npm run lint` e `npm run typecheck` aprovados. `npm test -- src/features/affiliates src/middleware.test.ts`: **153 testes / 20 arquivos aprovados**. `git diff --check -- frontend` sem erro de whitespace.

Build de produção pelo executor isolado `e2e/affiliates-server.mjs` aprovado. Mantidos avisos preexistentes de CSS/autoprefixer, plugin ESLint Next, múltiplos lockfiles e `next start` com standalone.

E2E final: **38 / 38 aprovados**, desktop e mobile, em 2,8 minutos incluindo build. Foram executados `affiliates-ui.spec.ts`, `affiliate-early-handoff.spec.ts`, `pets-admin-settings.spec.ts` e `pets-landing.spec.ts` pelo executor isolado nas portas próprias 3016/4458, sem PostgreSQL/Redis ou sessões pessoais. A primeira rodada encontrou a expectativa de foco antiga; fixture/expectativa foram corrigidas e a rodada final completa passou. O teste E2E TypeScript foi conferido novamente após esse ajuste (`tsc --noEmit -p e2e/tsconfig.json`). Configs temporários foram removidos e `next-env.d.ts` gerado foi restaurado.

Capturas atuais da página simples em `docs/frontend-profissional/evidencias/frontend-prepublicacao-2026-10-30/pets-desktop.png` e `pets-mobile.png`. Capturas das configurações Shopee/política foram atualizadas pelo E2E na pasta histórica `pets-landing-2026-10-30`.

Inspeção real Playwright MCP da página simples em 390 × 844: um h1, uma imagem principal, um CTA de 56px para o convite, zero `details`/`section` dentro de `main`, sem overflow horizontal. Consentimento compartilhado visível e CTA acessível acima dele. A chamada CSRF retornou 404 no fixture HTTP simplificado; não se trata de validação de API real.

## Limites e reversão

Não foram usados WhatsApp/Shopee reais, nem enviados produtos/mensagens ou criadas entradas em grupo. Fixtures validam UI/contratos. O limite sem JS do Suspense compartilhado, documentado na implementação inicial, não foi alterado. Não houve inspeção em aparelho físico ou alegação de conversão.

Para reverter apenas esta revisão, repor o componente/CSS e teste Pets anteriores, o avatar anterior e a expectativa anterior de foco. A reversão do lote completo deve considerar os componentes novos de Shopee/política e os pontos de integração listados no Git. Nenhum commit, push, deploy ou ação Meta foi executado por este agente.
