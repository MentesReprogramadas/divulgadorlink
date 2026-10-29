# Afiliados e WhatsApp: jornada e geração automática

Extensão solicitada em 28/10/2026, na worktree `C:/VSCODE/temlink-afiliados`, branch `codex/afiliados-whatsapp`, iniciada de main. Nenhum commit, push ou deploy foi feito. A pasta original foi preservada.

## Resultado

A geração automática do Mercado Livre foi confirmada pelo BFF real: login administrativo normal, CSRF válido, POST `/bff/v1/admin/affiliates/catalog/affiliate` com `productUrl` do anúncio `MLB4552665179` retornou200 com link curto, completo, etiqueta e perfil. Não depende de cache ou preenchimento manual. O ML pode reutilizar um link existente para o mesmo anúncio/etiqueta; não prometemos um URL diferente em cada clique. Causa e validações estão em [mercado-livre-geracao](2026-10-28-mercado-livre-geracao.md).

A central possui visão geral e rotas próprias para segmentações, grupos, conexões, catálogo, ofertas e envios. Usa as superfícies, atalhos e abas responsivas da visão geral de Minhas páginas. Rótulos passam a distinguir conta WhatsApp/conexão, segmentação/tema, grupo e oferta. Rotas diretas e voltar/avançar no navegador mantêm a área selecionada.

O assistente de segmentação tem três etapas: identidade/convite/foto, conexões e revisão. Permite criar e editar uma conexão durante o fluxo, obter o QR e conferir o estado no servidor antes de finalizar. Preserva os campos ao voltar; exige ao menos uma conexão aberta, incluindo validação final no backend. Uma conexão pausada já selecionada pode ser removida sem reativá-la.

O upload aceita JPG/PNG/WebP no navegador, normaliza para WebP e remove metadados. O backend valida novamente tamanho/pixels/decodificação, reencoda e guarda bytes em `AffiliateImage`, por tenant. A prévia exige admin e não usa cache; o provedor recebe base64, sem expor URL pública da foto. Referências de outro tenant são recusadas. A foto é modelo dos novos grupos; não modifica automaticamente grupos existentes.

A relação N:N `AffiliateSegmentInstance` permite várias conexões por segmentação e reaproveitar a conta em diferentes segmentações. A migration `20261028210000_affiliate_segment_instances` foi aplicada somente aos bancos locais de teste e painel. Faz backfill dos provisionadores e contas dos grupos existentes, sem apagar dados. Mantém o provisionador efetivo para reconciliar uma criação pendente.

O worker alterna contas elegíveis, adquire lease por conta, verifica conexão e acesso ao grupo antes de enviar e registra `sentViaInstanceId`. Outra conta pode assumir uma falha de pré-verificação antes do envio. Resposta incerta não é repetida automaticamente. A revisão encontrou e corrigiu uma corrida entre RETRY de entrega antiga e aprovação de nova distribuição: ambas agora serializam na mesma oferta, impedindo dois envios ativos para o mesmo destino.

## Verificações

- Frontend: lint, typecheck e build completos aprovados;849 testes em219 arquivos. Build foi feito em `.next`, separado do dev3016 em `.next-ondas-demo`. Permanecem avisos anteriores de CSS/autoprefixer, múltiplos lockfiles e plugin ESLint do Next, sem erro de compilação.
- Playwright Test: seis E2E determinísticos desktop/mobile aprovados, incluindo wizard do zero, cadastro/conexão inline, revisão, foco e Axe nos estados cobertos. Dois E2E adicionais integrados passaram em API3352/provedor4453/banco de regressão: persistência, convite com expansão e entrega para dois grupos.
- Navegador isolado, sem mocks: login/BFF e geração ML200; upload real de JPG200, prévia privada WebP200; wizard mobile390 sem overflow, com foco na etapa de conexão. Não foi criada conexão ou segmentação real durante essa inspeção. O único upload descartável dessa inspeção foi removido por ID após confirmar que não era usado.
- Backend: lint, typecheck, build e geração Prisma aprovados. Suíte completa final: **807 testes /180 arquivos**, incluindo as provas de Pix com banco e Redis isolados. Suíte dirigida de domínio/adapters/serviços/HTTP/PostgreSQL/ponte: **88 testes /13 arquivos**, todos aprovados.
- Os testes de Pix inicialmente apontaram para o banco legado5433, sem a coluna `emailDigest`. Foram repetidos com banco migrado de regressão e Redis5641 separados, ambos aprovados; o banco legado não foi alterado.
- Uma rodada ampla revelou que Prisma também lê `.env` ao importar o client. Desabilitar somente o dotenv não bastava. Os testes agora desabilitam o carregamento do Vite/dotenv e preenchem credenciais de integração com valores vazios antes do import do Prisma; uma regressão verifica a ausência das credenciais reais. Testes nativos de OAuth voltaram a passar.
- O servidor integrado de fixtures foi separado do painel real: só aceita banco de regressão nomeado, chave de fixture e portas3352/4453; não pode iniciar usando o banco vivo `affiliate_ops`. Foi encerrado após o E2E. Testes de worker/PG são executados sem o drain de fixtures concorrente.

As capturas foram abertas e inspecionadas em `output/local-affiliates/review-journey/`; as evidências determinísticas estão em `docs/frontend-profissional/evidencias/afiliados-whatsapp-2026-10-28/`.

Após os checks, o banco descartável de regressão foi removido somente depois de verificar ausência de conexões. O Redis5641 de regressão também foi removido. Permaneceram intactos o banco `affiliate_ops` e o Redis5640 do painel real. Para repetir provas integradas, recriar o banco de regressão com as migrations e o Redis dedicado, configurar o servidor de fixtures3352/4453 e executar o config Playwright de integração; não apontar esse servidor para o banco do operador.

## Acesso e limites

Painel: <http://localhost:3016/admin/afiliados>. Login: <http://localhost:3016/login>. Conta administrativa local já fornecida ao operador; nenhum papel visual concede autorização no servidor. API3351, ponte4452, PostgreSQL5638 e Redis5640 continuam locais, com worker normal. As instâncias/grupos do VHG não foram importados. Última inspeção do tenant local: zero conexões, grupos, segmentações, ofertas e entregas, pronto para começar do zero.

O operador precisa criar a conexão e ler o QR com seu telefone. Contas de reserva precisam participar dos mesmos grupos e ter permissão de envio; selecionar a conta não altera a participação no WhatsApp. Rodízio distribui carga e disponibilidade, sem garantia contra bloqueios. Nenhuma mensagem real, compra ou comissão foi validada nesta rodada.

A página pública de destino do ML ainda pode responder403. A geração/vinculação é comprovada pela resposta autenticada; a alteração não contorna o controle de acesso público. A ponte local usa SSH e a sessão existente no VHG; depende da validade da sessão e do formato do gerador web. Tokens/cookies permanecem na VPS, SQLite somente leitura, sem mudança do aplicativo remoto. Essa ponte é infraestrutura local de teste, não um deploy de produção.

## Reversão

Parar somente os processos locais desta worktree encerra o preview. Para reverter código, revisar seletivamente a fatia desta feature; não usar reset global nem apagar a pasta original. Preservar backup do PostgreSQL antes de reverter qualquer migração já utilizada. As novas relações e imagens são aditivas; não houve rollback automático nem exclusão de dados do operador.
