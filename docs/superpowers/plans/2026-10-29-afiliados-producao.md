# Publicação e configuração de afiliados em produção

Autorização explícita do usuário em29/10: publicar todo o trabalho, reproduzir configuração local de ML/WhatsApp na própria conta de produção, usar o grupo real **TLA | Achadinhos de Natal 🎄🎁 #03** e enviar exatamente um produto de teste após configurar. Não usar o grupo local de testes. Credenciais fornecidas pelo usuário não devem aparecer em código, relatórios, logs ou commits.

- [x] Finalizar rodapé somente com aviso de preço/estoque e preservar título/mensagem exatos da prévia.
- [ ] Preparar gateway permanente HTTPS na VPS, SQLite VHG somente leitura; nenhuma cópia de tokens em texto aberto ou alteração da sessão de origem.
- [ ] Corrigir integração CI dos novos testes, conferir diff/segredos/migrations, executar checks e publicar commit revisável na main pelo fluxo existente de CI/CD.
- [ ] Publicar API/migrations, worker e frontend; conferir saúde e rollback disponível. Configurar chave de cifragem privada consistente em API/worker, ponte e integrações existentes.
- [ ] Recriar instância/segmentação por API ou script com contexto de tenant/conta corretos e cifragem de produção; consultar Evolution e confirmar nome/JID do grupo real. Nenhum outro grupo ativo na segmentação do teste.
- [ ] Gerar produto/preço/link/título reais, conferir snapshot de destino único, aprovar um envio e verificar resultado sem repetir respostas incertas.
- [ ] Verificar painel de produção com a conta do usuário, registrar versão, IDs de implantação e evidências sem segredos; manter local preservado e remover apenas fixtures descartáveis.

Rulings: a autorização de publicação substitui as restrições anteriores de não publicar, sem autorizar alterações em outros produtos. A ponte local loopback não funciona em produção; serviço dedicado somente de leitura é necessário para reproduzir a integração. Credenciais cifradas não podem ser copiadas entre tenant/chaves; recriar com o contexto de produção. A mensagem aprovada distribui para todos os grupos ativos da segmentação; por isso o teste terá um único destino confirmado.

## Primeira execução do CI

Commit b9d50064 publicado na main. CI40852097409: afiliados desktop/mobile e três imagens Docker passaram. Frontend:911/912 testes passaram; teste da busca pública encontrava região status ainda vazia e verificava o texto antes da resposta. Corrigida a espera pelo conteúdo, mantendo o mesmo total e URLs assinadas; três testes da busca passaram localmente. Deploy permanece bloqueado pelos checks. Backup PostgreSQL anterior às migrations criado na VPS (27.275.244 bytes); restauração não executada.

Correções b5dc7cfa: mock Google Ads simula bootstrap CSRF e exige um POST com token correto (sete cenários passaram). GET público de CSRF permitido em host próprio ativo, preservando bloqueio de sessão/login e cookies privados: teste falhou antes,17 testes afetados passaram e três E2E incluindo setup passaram em banco isolado. Baseline Linux inspecionada:800 pixels diferentes somente no novo item da sidebar. Baseline Windows regenerada com teste administrativo Axe/layout aprovado:1404 pixels diferentes no retângulo [64,846,237,859], restritos ao item. SEO aguarda título visível/line-height computado antes da mesma medição. Caso de recuperação de idade da busca passou localmente sem alterar runtime. Segunda rodada web completa passou; ainda aguarda fechamento das demais suítes.

Fechamento dos bloqueios restantes: confirmação de idade retornava204 e consultas terminavam, mas stream de router.refresh permanecia pendente no Chromium Linux. Navegação de documento para a mesma URL evita essa dependência; preserva filtros/hash e remove cursor anterior. Quatro testes de comportamento falharam antes e passaram depois;26 E2E de busca/idade desktop/mobile passaram, agora exigindo navegação de documento após aceitar/recusar. A causa interna do stream React/Next não foi determinada; não se alterou timeout/cache para encobri-la.

Outra falha real: GET inicial de favorito podia terminar depois de um PUT e sobrescrever visualmente o estado confirmado. Contador de mutação invalida leituras antigas e evita novas leituras durante a alteração. Regressão unitária falhou antes e passou após correção;13 testes dos componentes afetados e dois E2E de favoritos, incluindo setup, passaram. Lint/tipos frontend passaram. Grafo incremental local:8547 nós/30789 relações, sem LLM/API/envio externo.

Preflight VPS: Docker Node24, usuário node, rede desativada e volume de dados inteiro readonly abriram SQLite real com WAL/SHM; catálogo conectado e sessão de afiliados presente. Chave Evolution da própria conexão local difere da integração antiga; configurada apenas nas variáveis AFFILIATE da API/worker, preservando integrações existentes. Nenhuma mensagem real enviada até esta etapa.
