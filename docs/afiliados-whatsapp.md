# Central administrativa de afiliados e WhatsApp

Atualização autorizada: [jornada, múltiplas conexões e geração automática](relatorios/2026-10-28-afiliados-jornada.md). Catálogo central real; instâncias/grupos começam do zero, sem importar os do VHG. A geração nova foi comprovada pelo BFF, validando o anúncio/vendedor e a atribuição na resposta autenticada do ML.

Atualizações posteriores: [jornada guiada](relatorios/2026-10-28-afiliados-jornada-guiada.md), [contas e sessões do ML](relatorios/2026-10-28-mercado-livre-contas-sessoes.md) e [sugestões automáticas e fotos](relatorios/2026-10-28-afiliados-descoberta-automatica.md).

Implementada na branch `codex/afiliados-whatsapp`, baseada em `origin/main` (`2e30da70`), em `C:/VSCODE/temlink-afiliados`. A árvore original `C:/VSCODE/divulgadorlinks` foi preservada. Sem commit, push, publicação ou importação de banco. A configuração local autorizada usa Evolution existente e ponte privada para ML; os segredos da origem central permanecem na VPS. Sessões próprias fornecidas pelo operador ficam cifradas por tenant no banco desta operação.

## Operação

Abra **Admin → Afiliados e WhatsApp** (`/admin/afiliados`). Somente o administrador ativo da própria conta acessa a API. Papéis visuais, equipes e sessões de suporte não concedem acesso. A interface permanece dentro do layout compartilhado do produto.

1. Em Conexões, informe um apelido para identificar a conta no painel. O participante inicial é outro número de WhatsApp incluído nos novos grupos, necessário somente para criação automática. Não é o telefone conectado pelo QR nem ganha papel administrativo por esse campo. A chave é configurada no servidor e não aparece no formulário. Ao salvar, o QR abre automaticamente; leia-o no telefone da conta que será conectada e confira o estado. Veja [clareza e QR](relatorios/2026-10-28-afiliados-formularios-qr.md).
2. Crie uma segmentação no assistente de três etapas. Defina separadamente o tema interno, por exemplo Natal 2026, e o nome público dos grupos, como Ofertas de Natal. Configure convite, descrição, foto por upload e capacidade; selecione uma ou mais conexões. Pode cadastrar, editar e conectar uma conta dentro do assistente. O servidor exige conexões abertas. Confira a opção de expansão automática, ativada por padrão no assistente, e o participante inicial necessário. Sem foto definida, a expansão consulta a foto do grupo atual.
3. O espaço da segmentação orienta a criação explícita do primeiro grupo ou a vinculação de um existente. O servidor confirma o JID e consulta o convite real. Cada grupo guarda sua conexão original, mas outras contas selecionadas podem enviar se participarem do mesmo grupo e tiverem permissão. Uma conta pode participar de várias segmentações. Sincronizar atualiza ocupação e nome; pausas preservam modelo e históricos.
4. Copie o endereço `/ofertas/entrar/<slug>` para um link comum de **Minha página**, um convite ou outro canal. A página não cria grupos ao abrir. O botão consulta o último grupo sequencial. Se estiver cheio, a expansão habilitada cria o próximo número e aplica descrição/foto antes de liberar o convite. Grupos anteriores continuam recebendo as ofertas da segmentação.
5. Criar a segmentação já inicia a expansão dos termos e a coleta em segundo plano. Em **Ofertas**, a aba **Produtos** mostra todos os anúncios com preço atual válido, com badges **Boa oferta** ou **A revisar**. **Descartados** contém decisões do operador e rejeições reais; fichas sem anúncio e falhas de consulta ficam no diagnóstico de **Configurações**. Todos os termos e páginas já coletados aparecem juntos, intercalados e sem anúncios repetidos; não há seletor de termo. **Anterior/Próxima** navega pela lista combinada, com até 20 resultados por página após o filtro de avaliação. A primeira página de cada termo é coletada antes de avançar páginas; o aquecimento usa intervalos de 30 segundos e depois ciclos de 15 minutos. A coleta respeita os limites reais do ML. O contador e a barra compacta mostram a próxima execução prevista; **Forçar atualização** solicita o próximo ciclo, respeitando coleta ativa e intervalo mínimo. O termo de origem continua nos detalhes de cada produto.
6. Clique em **Revisar e enviar**: o servidor confere novamente o anúncio, gera link e título e abre a prévia com foto, mensagem exata, preços disponíveis e grupos. **Enviar** confirma e salva a distribuição numa única transação; **Cancelar** não salva oferta nem envia. **Descartar** persiste a decisão; **Restaurar** libera nova avaliação. A prévia vale cinco minutos e mudanças nos grupos ou na conta exigem nova conferência. Não há etapa separada de cadastrar oferta. Ferramentas manuais e agendamento anteriores continuam recolhidos como complemento.
7. Após a confirmação, o processamento começa imediatamente; `npm run worker` mantém uma drenagem independente a cada segundo. Preserva leases no PostgreSQL, rotação, intervalo mínimo de três segundos por conta e resultados incertos sem repetição automática. Coleta de produtos não cria grupos nem envia mensagens. Conta própria do catálogo sobrepõe a central; a sessão de afiliados é separada. Desconectar não retorna silenciosamente à origem central.
8. **Envios** mostra cards paginados com foto, contagens e a mensagem aprovada, preservadas mesmo se a oferta mudar. Nos detalhes, **Entregas** permite filtrar o histórico. Falhas definitivas permitem nova tentativa isolada; resposta incerta exige conferência explícita no WhatsApp. Cancelar interrompe somente destinos ainda pendentes.

Critérios: reputação verde confirmada e desconto informado pelo ML de pelo menos 10%, ou queda de pelo menos 5% contra a mediana das observações anteriores em três dias distintos, numa janela de 30 dias. Falta de evidência fica em **A revisar**; reputação ruim e anúncios inválidos têm descarte explicado. Desconto informado não comprova queda histórica. Histórico próprio começa nas coletas desta operação; preço anterior ausente nunca é inventado. OpenAI expande termos e encurta títulos; não decide preços, reputação ou desconto.

## Configuração do servidor

Aplicar as migrations de afiliados até `20261029012000_discovery_term_pages`, incluindo `20261029010000_affiliate_intelligence` e `20261029011000_broadcast_product_snapshot`, pelo procedimento normal do projeto (`npm run db:deploy` no backend) e gerar Prisma (`npm run db:generate`). São aditivas. Nesta entrega foram aplicadas apenas nos bancos locais identificados; produção não foi alterada.

Variáveis documentadas em `backend/.env.example`:

| Variável | Uso |
|---|---|
| `WEBHOOK_ENCRYPTION_KEY` | Chave AES-GCM existente de 32 bytes em base64. Segredos ficam cifrados e vinculados ao contexto. Rotação exige migração das credenciais. |
| `AFFILIATE_EVOLUTION_BASE_URL` | URL HTTPS confiável do servidor Evolution; fallback para `EVOLUTION_BASE_URL`. HTTP somente loopback em desenvolvimento. |
| `AFFILIATE_EVOLUTION_API_KEY` | Chave padrão administrativa. O fallback sem chave específica é restrito ao tenant do servidor (`TENANT_HOST`). |
| `APP_PUBLIC_URL` | Origem pública usada no callback padrão de OAuth. |
| `MERCADO_LIVRE_REDIRECT_URI` | Callback cadastrado no aplicativo ML, normalmente `https://temlinkaqui.com/bff/v1/admin/affiliates/catalog/callback`. |
| `AFFILIATE_SERVICE_URL` / `AFFILIATE_SERVICE_KEY` | Gerador privado compatível com o VHG, endpoint `/api/generate`. Sessão do operador permanece no serviço. |
| `AFFILIATE_TAG` / `AFFILIATE_PROFILE` | Identificação esperada no resultado do gerador. Nenhuma identificação fixa do VHG foi importada. |
| `OPENAI_API_KEY` | Expansão de termos e títulos objetivos com gpt-4o-mini; saída estruturada, timeout e cache de 24 horas. Falha usa o tema/título original. Somente no servidor. |

Client ID e secret ML são configurados pelo admin e cifrados no banco. OAuth usa PKCE, state ligado ao administrador, validade de dez minutos e consumo único. Refresh é serializado para preservar tokens rotativos. O catálogo compara amostras de 20 fichas por página e até cinco páginas de cem vendedores por ficha; comparação incompleta permanece explícita. Acesso negado e limites do ML não são contornados. Total de resultados da fonte não significa que todos os produtos foram consultados ou têm anúncio válido.

## Decisões em relação ao VHG

Referência inspecionada: `MentesReprogramadas/vhg-promos`, revisão `e68fac8642f1bdb8c9a9f2e22b2b261965a58b88`. A referência possui SQLite, um destino e uma instância fixos. Foram adaptados os princípios de preço confirmado, revisão explícita, OAuth, afiliação e não repetição de entrega incerta ao PostgreSQL/Fastify existentes. Não importamos Next/Drizzle/pnpm, textos fitness, identificadores de afiliados, banco ou segredos do outro aplicativo.

Evolution foi conferido contra a fonte oficial v2.3.7, commit `cd800f2976e1e5b682fbf86a01ee4d85ae61f370`: [grupos e mensagens](https://github.com/EvolutionAPI/evolution-api/blob/cd800f2976e1e5b682fbf86a01ee4d85ae61f370/src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts), [validação de participantes](https://github.com/EvolutionAPI/evolution-api/blob/cd800f2976e1e5b682fbf86a01ee4d85ae61f370/src/validate/group.schema.ts). O conector aceita `pairingCode:null`, exige confirmação da aplicação dos metadados e trata HTTP400 de envio como incerto, pois pode ocorrer depois do aceite remoto. Não presumimos a versão instalada em produção.

OpenAI foi acrescentada por pedido explícito para termos e títulos, usando a chave existente. Não foram acrescentados radar de cupons, medição de vendas/comissões nem migração dos registros vivos do VHG. A coleta usa o catálogo autenticado integrado e informa seus limites.

## Limites reais

- Contas, sessões e permissões reais ainda precisam ser configuradas e verificadas pelo operador. Nenhuma mensagem real foi enviada. Acesso de OAuth não garante que o ML tenha liberado o catálogo.
- O gerador central usa a ponte privada existente; a sessão própria usa a requisição autenticada do gerador oficial. Não foi instalado navegador persistente. A resposta precisa confirmar origem/anúncio e atribuição/tag/perfil; geração não garante comissão ou elegibilidade de uma venda.
- A consulta de catálogo não cobre todos os anúncios do ML. Fichas ativas podem não retornar vendedor/preço; erros403/429 não são contornados. A interface separa sugestões guardadas dos contadores da última coleta.
- A consulta de ocupação não reserva uma vaga dentro do WhatsApp. Entradas por convites externos podem ocupar a última vaga. Grupos cheios antigos não são varridos a cada clique; a entrada usa o grupo mais recente.
- Se a criação ou aplicação de metadados ficar incerta, não se cria outro grupo automaticamente. **Conferir criação** permite registrar o JID correto ou confirmar ausência após consulta remota. Não redefinir o estado pelo banco sem conferência.
- Exatamente uma entrega não é garantida pelo provedor. Grupos já confirmados não são reenviados pelo processamento de falhas parciais; a resolução humana pode autorizar repetição.
- Dashboard mostra até 200 segmentações/instâncias/ofertas, 500 grupos e 100 distribuições recentes; o histórico de entregas é paginado. Totais são calculados no banco. Acima desses limites, ampliar a navegação das demais entidades antes de usar a central nessa escala.
- Pausar/cancelar não desfaz uma requisição que já começou no provedor. Novo grupo criado depois de uma aprovação não recebe retroativamente o snapshot anterior.

## Verificação e reversão

Capturas, testes visuais/teclado/zoom CSS/axe e limites: [evidências frontend](frontend-profissional/evidencias/afiliados-whatsapp-2026-10-28/README.md). A raiz registra os resultados consolidados em `docs/relatorios/2026-10-28-afiliados-whatsapp.md`.

Para retirar a feature, remover o registro das duas rotas admin, a drenagem no worker, o novo destino/ícone e as duas rotas frontend, preservando as demais integrações. Reverter só os arquivos/deltas desta branch. As tabelas podem permanecer inertes; não remover dados de grupos/entregas/contas reais sem backup e autorização. O BFF ganhou uma correção independente para encaminhar `Location` relativo de forma segura.
