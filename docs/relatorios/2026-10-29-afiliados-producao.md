# Afiliados e WhatsApp em produção

Código: `54c1543e02240185fadf8aa513d253a9ba67b99d`, origin/main. Base preservada: `2e30da70`. Workspace de implementação: `C:/VSCODE/temlink-afiliados`; checkout original preservado.

## Publicação e validação

[CI 40857990791](https://github.com/MentesReprogramadas/divulgadorlink/actions/runs/40857990791): 25 jobs aprovados, incluindo backend/PostgreSQL/Redis, frontend, três imagens Docker, jornadas desktop/mobile e deploy. As falhas anteriores foram investigadas e corrigidas sem remover testes, aumentar tolerâncias ou desativar Axe.

- CSRF público permitido somente por GET em hosts de páginas ativos; autenticação/sessões e cookies privados permanecem bloqueados nesses hosts.
- Fixtures Google Ads simulam bootstrap e verificam um POST com o token correto; sete casos passaram.
- Busca aguarda o anúncio de resultados carregado. SEO aguarda CSS/visibilidade antes de medir a mesma regra tipográfica.
- Confirmação de idade evita o stream RSC que ficava pendente após 204: navegação de documento mantém URL/filtros/hash e remove cursor antigo.26 E2E de busca/idade passaram localmente e as duas suítes passaram no CI. A causa interna no React/Next não foi determinada.
- Favoritos ignoram GET anterior à mutação; teste reproduziu a corrida antes da correção. Jornada real com persistência passou.
- Baselines administrativas inspecionadas: mudança restrita ao novo item da sidebar. Não foram atualizadas outras telas para encobrir diferenças.

API e frontend: health HTTP200. Ponte: running:healthy. Worker: processo running:unknown, sem probe próprio; coleta automática e envio foram exercitados. Todos no SHA acima. A ponte recebeu duas reimplantações de configuração no mesmo código testado.

## Ponte permanente Mercado Livre

Serviço privado HTTPS na VPS existente, sem servidor pago adicional. `custom_docker_run_options --mount` foi salvo pelo Coolify, mas ignorado na composição real; contêiner inicial não tinha dados e reiniciava. Corrigido pelo armazenamento de diretório do Coolify, origem do volume VHG e destino `/data:ro`. Inspeção Docker confirmou `/data RW=false`.

SQLite aberto readOnly, incluindo WAL/SHM, por Node 24/usuário node; nenhum token, sessão ou banco do VHG foi regravado. Smoke HTTPS: 401 sem chave, 200 com chave e 20 produtos reais na busca Natal. Fonte não configura relay N8N e usa API ML diretamente a partir da mesma VPS.

Readiness configurado como cmd `node /app/health.cjs`, arquivo de configuração do Coolify montado em `/app/health.cjs`. Ele faz GET local no status protegido e exige 401, sem usar ou expor chave. O API do Coolify rejeita metacaracteres no campo de comando; código fica no arquivo de configuração, não em argumentos de shell. A saúde final foi conferida.

Chaves privadas configuradas só em runtime. Chave de cifragem consistente em API/worker; credenciais não foram copiadas como ciphertext entre tenants. A chave da conexão local difere da integração antiga de notificações: apenas AFFILIATE_EVOLUTION_API_KEY foi configurada para a conta correta. JWT, pagamentos e integração Evolution antiga preservados.

## Configuração e envio real

[Administração](https://temlinkaqui.com/admin/afiliados), conta do usuário validada como admin ativo no próprio tenant. Instância Principal 01 conectada; segmentação Natal, slug natal, imagem reenviada pelo upload autenticado e termos automáticos. Grupo base TLA | Achadinhos de Natal 🎄🎁. Único destino ativo: **TLA | Achadinhos de Natal 🎄🎁 #03**. Grupo local Teste e grupos/instâncias antigos do VHG não foram importados.

A conta conectada não é administradora do #03: leitura do grupo permitida, obtenção do convite retorna not-authorized. O grupo permite mensagens de participantes. Foi cadastrado somente como destino de envio, inviteUrl nulo previsto no modelo, com validações de tenant/admin/vínculos, transação serializable e AuditLog. Não foi simulada permissão nem gravado convite falso. Convites aguardam promoção da conta no WhatsApp; pedido apresentado ao usuário.

Produto: kit de 4 capas de almofada de Natal Oxford 45x45cm. Preço novo R$ 47,43; anterior informado R$ 59,90; economia R$ 12,47 e 20% OFF, sem alegar histórico inexistente. Link novo gerado automaticamente e validado pela integração. Prévia inicial e Refresh retornaram OPENAI; Refresh preservou preço/link/foto/grupos/expiração e atualizou título/mensagem/token juntos.

Título enviado: Capas de Almofada Natal Oxford 45x45cm Kit 4 Decoração. A mensagem termina somente com Preço e estoque podem mudar. Confira as condições na loja. Não contém o rótulo Link de afiliado.

Aprovação única em 29/10/2026, 08:01 BRT. Broadcast `cmvtfnd1r000gkt01ivvod8r2`: uma entrega SENT, providerMessageId presente, zero falhas/pendentes/incertas. Leitura no banco confirmou título/mensagem exatamente iguais à última prévia. Não houve segundo envio.

Fotos carregadas em todos os oito cards iniciais e na prévia. Histórico real conferido em desktop e 390px, sem overflow horizontal. Capturas privadas locais em `output/prod-release/production-preview.png`, `production-sent.png` e `production-history-mobile.png`. Consentimento recusado somente no contexto isolado de teste. Coleta automática posterior READY em 3,4 s, 15 produtos disponíveis e próxima coleta agendada; não é afirmação de cobertura total do ML.

## Backup, reversão e limites

Backup PostgreSQL anterior às migrations criado na VPS, 27.275.244 bytes; leitura do catálogo pg_restore validada. Restauração não executada. Para reversão, reimplantar o último SHA previamente validado, 2e30da70, nos serviços originais; avaliar compatibilidade antes de alterar banco. Migrations são aditivas e dados novos devem ser preservados. Não restaurar backup antigo automaticamente sobre pedidos posteriores.

O teste real comprova envio aceito pelo provedor, não leitura/compra pelos participantes. Não se forçou lotação nem criação de outro grupo real. Convite do #03 ainda depende de administrador no WhatsApp. Sessões ML/WhatsApp podem expirar. Estes apontamentos operacionais são locais posteriores ao deploy; não houve nova alteração de código após o CI aprovado.

## Atualização de convites e celular — 29/10

Após o usuário confirmar a conta como administradora, o convite real do grupo #03 foi recuperado pelo fluxo público e persistido. Conferência administrativa: inviteAvailable=true, três participantes, um grupo e um broadcast; nenhum envio adicional. A correção de layout móvel e os bloqueios de CI descobertos estão em docs/relatorios/2026-10-29-afiliados-mobile.md. Publicação da revisão c0520e742bbc85ac27ab7eee0e7b737b109b17ae em validação no CI 40873065415.

Concluído: c0520e742bbc85ac27ab7eee0e7b737b109b17ae, CI 40873065415 com25/25 jobs aprovados. Quatro deployments concluídos; conferência móvel/desktop, conexões e estado final detalhados no relatório mobile.
