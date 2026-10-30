# Formulário de ingresso e mensuração opcional — frontend

Implementado em `C:/VSCODE/temlink-afiliados` e LP independente `C:/VSCODE/achadinhos-pet-lp`. Sem commit, push, publicação ou alteração de campanha. Mudanças existentes em contracts.ts/discovery-panel.tsx preservadas.

## Comportamento e contrato

Nova `/ofertas/participar/[slug]` usa SSR público e metadados existentes, com canonical próprio e noindex/nofollow. Segmentação indisponível não oferece formulário. `/ofertas/entrar/[slug]`, middleware de redirecionamento e fluxo rápido permanecem intactos.

Telefone flexível, aceite opcional desmarcado e copy sobre evento de ingresso compartilhado com a Meta para mensuração. Participação continua sem aceite. BFF dedicado `/api/affiliate-entry/[slug]` recebe POST, responde OPTIONS e permite apenas origins HTTPS `temlinkaqui.com`/`pets.temlinkaqui.com`; dev permite localhost/127.0.0.1 nas portas 3000/3018/3019. Não altera CORS/CSRF/BFF genérico.

Consome POST `/api/v1/public/affiliates/:slug/conversion-intent` com `{phone,marketingConsent,sourceUrl,fbclid?,fbp?}` e resposta `{joinUrl,tracked}`. Browser usa credentials omit, não lê/grava cookies de anúncio/storage, lê fbclid da URL somente no submit aceito. SourceUrl enviado sem query/hash. Sem consentimento, DNT ou GPC, envia phone vazio e omite identificadores. O número não aparece em URL/storage/logs. BFF repassa Origin real, User-Agent e privacidade, resolve tenantHost; não encaminha Cookie/Authorization nem Set-Cookie de resposta. `forward` ganhou somente propriedade origin opcional.

Navegação exige HTTPS, host exato temlinkaqui.com, sem credenciais/porta/query/hash e caminho `/ofertas/entrar/<slug>`. Não apresenta ingresso como confirmado; backend faz confirmação e CAPI.

LP Pets preserva identidade, assets,87% e motion existentes; três CTAs abrem um único dialog nativo. Foco inicial no telefone, Escape/retorno ao CTA e foco contido. Pending bloqueia envio/fechamento duplicado; falha mantém dados. server.cjs permite connect-src ao BFF main. Hosting deve preservar essa CSP. PORT opcional permite servidor isolado3019 sem encerrar3018 existente.

## Verificação executada

- frontend: lint e typecheck aprovados;17 testes unitários em BFF HTTPfixture, formulário React, transport e redirect existente aprovados.
- build frontend isolado `TEMLINK_E2E_BUILD=1 npm run build`: aprovado. Avisos preexistentes de CSS start/end, múltiplos lockfiles e plugin Next ESLint; sem novas dependências/lockfiles.
- Playwright main:4 testes aprovados desktop1440/mobile390, com fixture HTTP local somente GET para SSR e POST interceptado no navegador. Canonical/robots, availablefalse, ausência de envio automático, busy, retry/erro, número preservado, ausência de atribuição sem aceite, reflow e Axe zero violações nessas capturas.
- LP Playwright:10 testes aprovados desktop/mobile,320px, teclado,3 CTAs, Escape/retornofoco, reducedmotion/pausa, ocupação87%, nenhuma chamada de marketing na abertura, consentimento opcional e explícito, erro/retry, DNT/GPC, pending sem fechamento/envio duplicado e destino externo bloqueado. Axe zero violações na página e modal testados.
- Playwright MCP: inspeção real LP390px, modal352x622px e ação totalmente na viewport844px; foco no telefone e sem overflow. Capturas LP e main inspecionadas. Detector Impeccable sem achados no formulário main; LP apontou somente bordas coloridas/glow já existentes e preservados pelo escopo.

Capturas main em docs/frontend-profissional/evidencias/affiliate-entry-2026-10-30; LP em evidence/. Testes nunca consultaram backend/WhatsApp/Meta reais.

## Limites e reversão

Não comprova produção, CAPI ou evento de ingresso real. Políticas globais de Consent/SiteVisits e cookie de sessão existentes no main continuam; formulário novo não instala marketing. Backend deve habilitar conversões/origins por tenant. Domínio de navegação intencionalmente fixo na operação temlinkaqui.com. Grafo deve ser atualizado conjuntamente após integração backend; índice anterior foi consultado e não representa estes novos arquivos ainda.

Reverter somente arquivos novos de form/rota/testes/config e hunks opcionais origin de upstream; LP reverter mudanças em dist,server e testes. Não reverter WIP paralelo nem tocar banco. Sessões locais3018/3000 existentes não foram encerradas.


## Revisão posterior — cadastro e qualificação

Aceite nos dois formulários agora menciona compartilhar cadastro e confirmação de ingresso para medir e otimizar anúncios. O envio do cadastro inicial não afirma participação; confirmação continua dependente do backend. Adicionada seção específica à privacidade, pela fonte compartilhada src/domain/legal.ts: aceite opcional, SHA256 não anônimo, identificadores de clique quando existentes, contexto cifrado7dias e recibo mínimoHMAC90dias. Não foram alterados outros textos legais.

BFF lê corpo por stream com limite4096bytes antes de concatenar; Content-Length maior que4096 rejeita antes de getReader. Limite também vale sem header e com header inferior falso; ao exceder cancela stream. Testes focais de cópia, transporte e legal aprovados12/12; LP modaldesktop/mobile2/2 com capturas atualizadas.

Validação final desta revisão: lint/typecheck e novo build isolado aprovados;6 E2E main desktop/mobile passaram incluindo seção nova de privacidade, canonical, copy atualizada e capturas renovadas. Avisos de build permanecem os preexistentes descritos acima. Next-env gerado restaurado.
