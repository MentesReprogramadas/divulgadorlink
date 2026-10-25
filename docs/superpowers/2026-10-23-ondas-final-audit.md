# Ondas — auditoria atual e demonstração

## Ambiente e fonte de verdade

Rodada de 23/10/2026, na branch existente `codex/roadmap-f37-testes`, preservando a árvore compartilhada. O reinício antes recusado foi executado após o novo pedido. Demo: http://ondas.localhost:3013/; referência: `/dev/homes/ondas` e `/dev/homes/ondas/link/frequencia-indie`.

A primeira reinicialização revelou outra colisão concreta: um E2E externo apagou `.next-e2e`, usado pelo dev de revisão. A demo foi isolada em `.next-ondas-demo` com `TEMLINK_DEMO_BUILD=1`; o E2E normal conserva seu diretório e fluxo. `.gitignore` e os tipos gerados do Next reconhecem esse diretório. API3346 e worker foram reiniciados por `output/ondas-demo/start-api-review.mjs`, com os mesmos31 campos de ambiente do harness e somente transportes locais. PostgreSQL5446, Redis6393 e stubs4112/4456 foram preservados. Não houve deploy, nova branch, commit, dependência ou lockfile deste lote.

Outro E2E sobrescreveu o arquivo global de fixtures. Os testes desta revisão usam `state-review.json`, derivado por SELECT e verificação de cinco contas sintéticas, por um adaptador de leitura restrito ao processo, offset13 e run ID próprio. Não reescrevem o estado global nem executam setup/teardown contra a demo.

No fechamento, a demo3013 foi reiniciada normalmente no último código e ficou pronta em2,7s (`output/ondas-demo/dev-restarted-final.log`). A produção isolada3018 usada pelos testes foi encerrada pelo próprio wrapper, preservando a demo. A raiz abriu novamente home/detalhe: HTTP200, seis cards, quatro fotos e três ícones carregados, nenhum botão de pausa, overflow ou erro de página. Uma proposta sintética de substituição da imagem de Frequência Indie ficou pendente na fila Anexos; a capa pública previamente aprovada foi mantida. Não houve envio externo.

## Auditoria por arquivo

`ondas-component-audit-coverage.csv` consolida535 arquivos únicos de produção:417 TSX e118 CSS em app/components/features. Inventários complementares registram tratamento, responsável, componentes, evidência e limites de cada arquivo. Os39 CSS inicialmente ausentes foram lidos individualmente. Três helpers/estilos legados sem consumidor de produção não foram transformados em nova UI.

Revisão de fonte não equivale à inspeção de todas as variantes renderizadas. O inventário mantém essa distinção; capturas de uma rota não certificam todos os estados possíveis do arquivo. Publicações com aparência escolhida pelo dono, QR branco, cores de estado e regras comerciais mantêm seu significado.

## Ajustes implementados

- Material `LiquidLens` compartilhado com a preview em cards, métricas, estados vazios/erro, formulários, skeletons, menus, painéis e autenticação. Hosts locais transparentes e isolados permitem enxergar a lente; nenhuma pintura global genérica foi usada para esconder lacunas.
- Select, calendário, menus, consentimento e sidebar separam a lente fixa da área que rola. Abas preservam a lente ao rolar na horizontal. Os filtros removem a margem excedente dos wrappers de input para alinhar os campos.
- Cabeçalho e rodapé usam a variante sem aro, sem bordas. Aprovar/rejeitar usam os tints semânticos próprios; ícones de interface são monocromáticos.
- Menu de ferramentas da página calcula espaço acima/abaixo, limita altura/laterais e permite rolagem interna. Escape fecha e retorna o foco. A régua invisível não monta clientes ópticos.
- Etapa Conferir e enviar usa o mesmo `LinkRow` do catálogo em modo de prévia tipado, com anexos preparados, título, descrição e facetas. Não há link falso, impressão nem ação externa. Sem imagem, não há região de imagem.
- Aba Anexos possui filtros, cards de revisão e diálogo de recusa. Painel e comandos WhatsApp compartilham a mesma decisão transacional, versão/hash, recibo, auditoria e outbox. Revisão e decisão usam o grupo operacional já configurado; não foi inventado envio ao telefone do publicador nem e-mail de “link publicado” ao aprovar só uma imagem. Testes usam transporte simulado local.
- Recomendações da busca ficam acima de Explore no. O diálogo nativo +18 mantém a confirmação existente, o conteúdo protegido e o desfoque de20px no backdrop de toda a página, com alternativa opaca para reduced-transparency/sem suporte.
- A inspeção encontrou envio GET nativo de credenciais antes da hidratação. Login/cadastro/recuperação/conta agora declaram POST, conservando os handlers existentes. Um teste observou a falha antes da correção; a navegação sem JavaScript é verificada com transporte interceptado de teste, sem conta real.

## Comparação real com a preview

Capturas atuais em `output/ondas-demo/parity-current/`, abertas pela raiz em desktop e celular. Home e detalhe consomem o mesmo CSS e a mesma lente da referência.

| Propriedade | Real e referência |
| --- | --- |
| Hero desktop | Outfit64px, peso500, mesmo texto e cor |
| Busca desktop |650px por66,34px; largura real anterior448px corrigida |
| Card desktop |411,33px, raio24px, imagem1,6:1, texto abaixo |
| Card destacado | Mesmo tint `#0c3a44a6` e identificação patrocinada |
| Detalhe desktop | Grade685,08/570,91px, gap24px; foto685,08×550px |
| Detalhe celular | Foto342×330px, raio24px; resumo abaixo |
| Overflow das quatro rotas comparadas | Ausente em1440 e390px |

Diferenças de conteúdo são deliberadamente preservadas: seis links reais de fixture, dois destaques administrativos, dados do DTO e contadores derivados de navegação. A barra de revisão da preview explica82px de deslocamento vertical no desktop e não aparece no produto. Não são inventados tipo, destaques comerciais, highlights ou números de visualizações ausentes no contrato. Relacionados seguem o ranking real do backend; não são preenchidos com cards fictícios quando não há candidato elegível.

O select com muitas opções foi rolado de0 a857px; a lente permaneceu exatamente em x900/y268,443×320px. A prévia de envio foi aberta com imagem, nenhum anchor e sem impressão. O menu da página foi aberto em390×844, permaneceu dentro da viewport e devolveu foco com Escape. Essas verificações não substituem todas as jornadas de negócio.

## Verificações e fechamento

- Suíte completa frontend:180 arquivos/629 testes aprovados (`output/ondas-audit-vitest-final.log`). Regressores posteriores são registrados separadamente, sem somar testes duplicados.
- Login nativo e facetas:6 testes aprovados, com RED→GREEN do método POST. Primitivas, toolbar, formulários e features têm os relatórios focais dos respectivos inventários.
- Frontend lint e tipos passaram; build final de produção passou. Lint e tipos de app/E2E foram repetidos após o fechamento e passaram (`output/ondas-audit-lint-closure.log`, `output/ondas-audit-types-closure.log`). A demo de desenvolvimento usa `.next-ondas-demo`, separado da saída de produção/E2E; o diretório de build não é prova de que todos os seus estados foram abertos no navegador.
- Backend: lint/tipos/build, seis testes PostgreSQL de avisos de anexos (incluindo disputa e rollback) e testes HTTP/repositório/template aprovados. Uma revisão independente de fonte não encontrou defeito concreto de autorização, idempotência ou privacidade. Nenhuma mensagem real foi enviada.
- Rodada histórica de vidro/login/+18:6/6 contratos aprovados em desktop/celular (`media-glass-final.log`), incluindo POST nativo sem JavaScript. Os dois casos de mídia na mesma execução falharam, portanto aquela rodada completa de8 casos não é verde. A rechecagem posterior da mídia encontrou locator estrito que também alcançava a imagem dos relacionados; foi restringido à região correta, preservando o teste da imagem aprovada. A rodada anterior `glass-regression-restored.log` teve4/4 aprovados; não somar execuções repetidas como cobertura distinta. As aprovações finais desses contratos constam na tabela abaixo.
- Rodada ampla anterior encontrou11/18 casos aprovados; os sete resultados restantes envolveram locator textual duplicado após ampliar a área clicável, bootstrap frio e layout no redimensionamento. O locator de coleção passou a usar o link acessível, preservando a assertiva. No caso de equipe mobile, profile/catalog iniciaram~15s depois da assertiva, com header de perfil correto; o contexto fechou6,2s após essas requisições começarem. Isso não demonstrou erro de autorização. A suíte dirigida de6 casos de layout fechou5 aprovados e1 falha (W09 mobile), em6,5min (`layout-final.log`): W14/W07 passaram nos dois tamanhos e W09 desktop passou. A rodada de produção abaixo aprovou equipe e W09 nos dois tamanhos e substitui essas pendências específicas; os resultados antigos permanecem registrados.

A matriz mantém95 rotas:9 possuem ao menos um estado visual atual revisto e38 receberam contratos comportamentais atuais em desktop/mobile. Essas contagens se sobrepõem e não devem ser somadas. Home/detalhe e referências possuem capturas nos dois tamanhos; painel/lista/preview de envio só desktop; menu de `/painel/perfil/dados` só mobile. `/admin/moderacao` tem o diálogo/fila desktop e a fila mobile efetivamente abertos. Login e busca receberam contratos E2E, sem nova aprovação visual. As outras colunas mantêm pendências/histórico; uma captura gerada ou um contrato aprovado não promove automaticamente um estado a inspeção visual. O diálogo de recusa inspecionado manualmente foi apenas aberto, sem enviar decisão; aprovações/rejeições dos testes usam fixtures descartáveis separadas.

Conciliação reproduzível em `output/ondas-final-visual/{current-route-reconciliation,production-contract-reconciliation,closure-capture-reconciliation}.json`. A raiz abriu as recapturas finais `parity-current/home-final-restarted-1440.png`, `detail-final-restarted-1440.png`, `demo-attachments-1440.png`, a fila de mídia mobile e a lista de links desktop da produção. A lista conserva três lentes nas métricas. Os outros PNG gerados pelos testes não foram declarados revisados por consequência desses exemplos.

`ui-quality.spec.ts` foi conferido contra o `ResponsiveTabs` atual: o helper `selectOption` trata o controle oculto e seleciona a aba acessível por `data-value`; os labels de `InsightTabs` permanecem compatíveis. Nenhuma correção concreta desses locators foi necessária. A suíte também contém baselines de screenshots: eventual divergência deve ser revisada, não atualizada automaticamente para obter aprovação.

A rodada de14 casos dirigidos em produção isolada3018 terminou com11 aprovados e3 falhas em6,2min (`output/ondas-demo/production-final.log`), mantendo a API3346, fixtures privadas e demo3013. A rechecagem após as correções terminou com10/10 aprovados em2,2min (`production-complete.log`). Comportamento/Axe/layout foram executados; comparação por baseline não foi executada (`--ignore-snapshots`). Os contratos confirmados, sem somar repetições, são:

| Contrato dirigido | Resultados desktop/mobile | Log que confirma |
| --- | --- | --- |
| Anexos: envio, análise independente, substituição, recusa e remoção |2/2 | `production-final.log` |
| Equipe autorizada: convite, editor, prévia e métricas |2/2 | `production-final.log` |
| Coleção pública, distribuição e comprovação/revogação de domínio |2/2 | `production-final.log` |
| W09: larguras320–1920, fonte200% e menu por teclado |2/2 | `production-final.log` |
| ui-quality usuário |2/2 | `production-final.log` |
| ui-quality público e admin |4/4 | `production-complete.log` |
| POST nativo sem JavaScript, camada da busca e confirmação +18 |6/6 | `production-complete.log` |

Essa tabela reúne contratos distintos de duas execuções, não uma única suíte integral. Admin mobile e contratos de vidro repetidos não são somados novamente.

As duas falhas públicas anteriores foram `label-content-name-mismatch` no link de coleção. A fonte removeu o nome acessível redundante, deixando o conteúdo visível nomear o link, com2 testes focais aprovados e posterior E2E público aprovado nos dois tamanhos. Admin desktop antes percorreu suas rotas/abas e falhou apenas na assertiva final que recolhe erros da página: React418. No trace, o erro ocorreu0,777ms após chamar a navegação de `/painel` para `/admin/visao`, antes de iniciar o request HTML de admin (~63ms depois), portanto o evento pertence à transição a partir de `/painel`. Duas reproduções do fluxo exato em desenvolvimento não reproduziram o erro. Aborto da hidratação é hipótese, não causa confirmada nem defeito de produção demonstrado.

O harness de `ui-quality.spec.ts` agora aguarda o botão `Menu` habilitado após a URL `/painel`: o botão nasce desabilitado no SSR e é habilitado por `useEffect`, fornecendo uma fronteira real de hidratação antes do próximo `goto`. O listener de `pageerror` continua ativo desde o início; nenhum erro foi ignorado ou apagado. Lint focal e reexecução pública/admin desktop/mobile passaram. A aprovação dessa execução não transforma a hipótese de causa do evento anterior em diagnóstico comprovado.

Os antigos bloqueios e resultados de outras versões em `ondas-platform-validation.md` e `2026-10-23-ondas-preview-parity.md` são históricos. Este relatório e os logs finais identificam o código atual. O Graphify foi atualizado incrementalmente, sem LLM/API/clustering; CSS, capturas e comportamento não são comprovados pelo grafo.

## Reversão e limites

Revisar e reverter somente os trechos deste lote nos arquivos apontados pelos inventários; não usar reset/clean na árvore compartilhada. A demo usa dados e credenciais sintéticos e transportes locais. Gateway real, entrega externa de WhatsApp, todas as combinações comerciais e todos os estados de todos os componentes não são certificados por esta revisão.
