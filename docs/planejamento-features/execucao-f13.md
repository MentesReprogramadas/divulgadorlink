# F13 — QR Code permanente

Estado: S0–S6 concluídas localmente; S7 em revisão por CI/liberação remotos pendentes. Continuidade autorizada; decisões fundamentadas sem perguntas rotineiras. Sem commit, push ou deploy.

## D15 — escolhas e alternativas

- Reutilizar `qrcode@1.5.4`, já usado no Pix, carregado somente ao abrir a ação. Não alterar o QR de pagamento nem criar outro gerador. PNG para compartilhar e SVG para impressão, em preto sobre branco, margem de quatro módulos, correção M. Tamanhos permitidos 256, 512 e 1024 px; 512 padrão. Alternativas: logos/cores/fundos transparentes e tamanhos livres; descartadas nesta entrega para preservar leitura e reduzir configuração.
- O payload vem exclusivamente do endereço público já conhecido no painel: conteúdo publicado da página, nunca o slug do rascunho; handle `/r/:id` existente, nunca o convite temporário. Origem atual validada, sem URL arbitrária, contato, token de sessão ou conteúdo privado. Não criar endpoint/tabela se as APIs existentes já resolvem identidade e autorização.
- Para páginas, a estabilidade depende de manter o endereço publicado: renomear o endereço, retirar do ar ou desativar um handle interrompe o destino. A existência do arquivo não garante disponibilidade permanente da plataforma. Avisar isso no modal, sem prometer QR eterno. Alternativas: renomear silenciosamente e manter alias público novo ou inventar um serviço de encurtador; descartadas porque mudariam contratos de endereço e retenção.
- Preservar revisão, idade e disponibilidade das rotas públicas atuais: o QR só codifica uma URL, não concede acesso. Uma nova revisão de destino mantém o mesmo handle e o mesmo payload. QR da página só aparece após publicação; QR de convite só para handle ativo e habilitado. Revalidar os dados pela API ao abrir para evitar exportar uma versão local obsoleta.
- PNG/SVG serão testados por decodificação real do arquivo gerado/baixado, além do fluxo e do MIME. O Chromium disponível não expõe `BarcodeDetector` (verificação local retornou `undefined`). Alternativas: aceitar screenshot como prova, depender de API ausente ou adicionar outro gerador; descartadas. Avaliar `jsQR` apenas como dependência de desenvolvimento para ler pixels RGBA, sem incluir câmera/decoder no produto; dependência exata e licença serão conferidas antes de instalar.

## Inventário e fronteira

`ProfileEditor` já usa `publishedContent.slug` para o endereço público e guarda rascunho pelo autosave. `RedirectScreen` lê `/me/redirect-handles/:id`, possui URL permanente e histórico de versões. `RedirectGrid` usa cards clicáveis inteiros: a nova ação entra no detalhe, evitando botão dentro de botão. Modal, campos, Select, botões, SkeletonRegion e erros vêm dos componentes locais. Nenhuma nova primitiva visual ou biblioteca de UI é necessária.

Gerador/dados de exportação ficam em uma feature compartilhada específica de QR; validação de alvo permanece pura. Filtros não se justificam para um único QR. A UI seleciona formato/tamanho, permite visualizar, baixar e copiar o endereço; falha mantém controles e possibilita tentar novamente. Downloads revogam URLs de objeto após o uso, e resultados de uma geração anterior não substituem uma seleção mais recente.

Documentação técnica consultada no Context7 e no pacote instalado: [node-qrcode](https://github.com/soldair/node-qrcode/blob/master/README.md), APIs browser de `toDataURL`/`toString`; [jsQR](https://github.com/cozmo/jsQR/blob/master/README.md), leitura de RGBA. A versão instalada será a referência executável; não presumir compatibilidade a partir de outro pacote de mesmo nome.

## Próximos gates

S1: RED/GREEN de origem/alvo/formato/tamanho e do payload estável; C de abertura, loading, erro, troca de tamanho e download sem duplicação. S2: sem modelo/migração, integrar as APIs autorizadas e testar ausência de efeitos. S3/S4: geração reutilizada e modal composto nas duas superfícies. S5/S6: downloads PNG/SVG efetivamente decodificados, atualização do destino preservando payload, isolamento das APIs atuais, desktop/mobile, teclado/Axe/320px e capturas inspecionadas. S7: relatórios e reversão; CI/release remotos separados.

## S1 em execução

Quatro testes de domínio tiveram RED real (três falhas por validação ausente, um comportamento já atendido) e GREEN; origem segura, rejeição de alvos temporários/privados, tamanho/formato e estabilidade sem dados de destino/contato. Uma primeira tentativa sem módulo foi falha de configuração e não foi contada como RED. Três testes de componente passaram: região fixa de loading, download indisponível antes da geração, erro/retry e resposta antiga descartada após trocar alvo. Esses testes usam fake somente do adapter de geração; não são prova de leitura do arquivo.

`jsqr@1.4.0` conferido no registro npm, licença **Apache-2.0**, somente devDependency para QA. O produto continua com o único gerador qrcode existente. A leitura E2E usará Canvas nativo para rasterizar o arquivo PNG/SVG baixado e jsQR para decodificar seus pixels; evita acrescentar parser de imagens/segundo gerador ou enviar arquivos a serviço externo. Logs em `output/roadmap-f13`; nenhuma biblioteca visual foi instalada.

## Integração e primeiras provas de navegador

Minha página e Convites ganharam QR Code no endereço público existente. Ao clicar, a própria API de perfil/handle é consultada novamente; só então o modal recebe `{kind,url,name}` validado. Nenhum draft, lista de links, contato ou destino temporário chega ao gerador. O modal não acessa sessão, transporte ou autorização. Perfil sem publicação e convite sem revisão ativa não oferecem exportação; desativação continua respeitada. Não há migração ou novo endpoint.

Na página, abrir o QR não força salvar/publicar rascunho inválido: exporta a publicação real, preservando o autosave em andamento. Alternativas: salvar o rascunho como consequência do download ou codificar o slug local; descartadas por misturar autoria com compartilhamento. O endereço da página já é imutável enquanto publicada; qualquer troca exige retirar do ar conforme regra existente. A advertência não cria alias novo nem muda essa regra.

Primeira bateria: 281 unitários frontend/84 arquivos, nove próprios da F13, lint e tipos aprovados. E2E dos convites passou desktop/mobile: arquivo efetivamente baixado, pixels decodificados, destino atualizado por fluxo real, PNG idêntico antes/depois, isolamento e desativação. A fixture de página inicial falhou porque só tinha link oculto; corrigida para incluir link público, preservando a validação de publicação. Não se alterou a regra da aplicação para liberar a fixture.

O E2E seguinte confirmou leitura de PNG/SVG em 256/512/1024 px, mas encontrou falha real de foco após fechar o modal de página. A consulta assíncrona desabilitava o botão antes de `showModal`, fazendo o navegador perder a origem. `OverlayDialog` recebeu `returnFocusTo` opcional, usado pelo QR com o elemento capturado no clique; cleanup só foca elemento ainda conectado. Os outros consumidores mantêm o comportamento anterior. Alternativas: remover a asserção de teclado, focar elemento genérico ou duplicar modal; descartadas. Trace/relatório RED em `output/roadmap-f13/focus-red-results`; repetição completa após o ajuste em execução.

## Fechamento local S0–S6

- Frontend: lint, typecheck (src + E2E), **281 testes / 84 arquivos**, sendo nove F13; build Next 15 aprovado pelo harness isolado. Comandos: `npm run lint`, `npm run typecheck`, `npm test`, build executado por `e2e/serve.mjs`. Logs `output/roadmap-f13/frontend-*-final.log` e `validation/frontend/e2e/.runtime/server.log`. Código de saída 0.
- **79/79 E2E** em uma execução final ampla: permanent-qr, profiles, redirects, profile-history, profile-billing, loading-layout e workspace-layout, projetos features/features-mobile. `E2E_RUN_ID=roadmap-f13 E2E_PORT_OFFSET=300 npx playwright test permanent-qr.spec.ts profiles.spec.ts redirects.spec.ts profile-history.spec.ts profile-billing.spec.ts loading-layout.spec.ts workspace-layout.spec.ts --project=features --project=features-mobile`. Relatório preservado `e2e-regression-results.json`, log `e2e-regression.log`.
- **4/4 E2E F13** na repetição final `npx playwright test --config playwright.qr.config.ts`: mesma aplicação e downloads, mais prova explícita de Shift+Tab até Baixar em 320px/200%. `e2e-zoom-final.log`; capturas finais no diretório de evidências. Não somar relatórios sobrepostos como testes únicos.
- T01: payload da publicação real, sem sentinelas privadas, GET revalidado e nenhuma escrita na linha de perfil. T02: alteração real do destino e PNG idêntico antes/depois, redirecionamento resolve o novo endereço. T03: PNG/SVG realmente baixados, assinatura/MIME, rasterização Canvas e decodificação independente em 256/512/1024. T04: advertência de disponibilidade visível, handle desativado sem QR, prévia não exportada.
- Regressão ampla prova o ajuste opcional de retorno de foco sem quebrar outros modais, editor/histórico, cobrança ou sidebar. Axe A/AA sem violações nos modais testados; teclado, Escape, foco e movimento reduzido conforme componentes existentes. Isso não é declaração de acessibilidade total.
- Doze capturas finais inspecionadas em `docs/frontend-profissional/evidencias/f13-2026-10-17`. No tamanho normal a ação cabe sem rolagem; em 320px/200% a rolagem vertical é necessária e o teclado alcança a ação. Corrigidos título excessivo, rótulos truncados e rodapé antes cortado; não se removeu conteúdo para esconder falha.
- Sem mudança backend própria: provas anteriores de F11 (490 U, 212 PG) ficam históricas, não recontadas como executadas pela F13. Esta entrega exercitou PostgreSQL/API reais no E2E e não inventou migration/repository.

## Reversão e limites

Remover as duas ações QR preserva Copiar endereço e todos os dados/URLs existentes. Nenhum arquivo fica armazenado no servidor; não há banco a resetar. O retorno opcional de foco só pode ser removido junto dos consumidores. `jsqr` é devDependency; não existe import no produto nem envio de imagem a terceiros. Nenhuma biblioteca de UI instalada; Pix usa o mesmo contrato anterior.

Fixtures PG/Redis foram criadas/removidas pelo setup/teardown com namespace próprio; nenhuma interrupção de processos alheios. Sem migração de desenvolvimento adicional. Sem commit/push/deploy ou CI remoto. S7 permanece em revisão; validade física em impressão/câmera não foi alegada. Manifesto SHA-256 identifica os arquivos de aplicação/harness conferidos contra a cópia validada.
