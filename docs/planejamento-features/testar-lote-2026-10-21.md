# Testar o lote concluído em 21/10/2026

Estado: implementação local na branch `codex/roadmap-f37-testes`. Novo pedido de 21/10 autorizou migração local, commit e push do lote; deploy não solicitado. Execução encerrada após F36 por pedido do usuário. F40 e F41 não foram iniciadas. São 40/42 implementações locais; isso não equivale a 40 liberações em produção. S7 continua em revisão.

## Preparação local

1. Conferir a branch e preservar as alterações existentes. Não usar reset, banco de produção ou os comandos de reset do harness no banco pessoal.
2. No backend, conferir `.env`: `DATABASE_URL` deve apontar para o PostgreSQL **local desejado**, `REDIS_URL` para o Redis local e `JWT_SECRET` deve permanecer estável. Essas três variáveis estão preenchidas na máquina, e o PostgreSQL local foi conferido e migrado por novo pedido em 21/10.
3. Fazer backup do banco local e aplicar as migrations pendentes: `cd C:\VSCODE\divulgadorlinks\backend`, `npm run db:deploy`, `npm run db:generate`. Este lote adiciona seis migrations, de `20261021120000_profile_discovery` a `20261021170000_agency_clients`. Aplicadas inicialmente em bancos descartáveis; por novo pedido de 21/10, já aplicadas também no banco local `localhost:5437/divulgador`, com backup e Prisma Client gerado. Produção não foi alterada.
4. Iniciar API com `npm run dev` e, em outro terminal do backend, `npm run worker`. O worker usa o mesmo banco, Redis e segredos da API. Na pasta frontend: `npm run dev`. O BFF usa `API_ORIGIN` (exemplo local: `http://127.0.0.1:3333`); o host precisa resolver um tenant cadastrado. Não definir `TENANT_HOST` em produção.
5. Usar contas ativas e com e-mail confirmado no mesmo tenant. E-mail local exige a configuração de envio já existente; não há bypass de confirmação novo. Métricas e testes A/B exigem a cobertura `profile.analytics` do plano F11 e medição habilitada. Não criar assinaturas por SQL no banco pessoal para testar.

F36 não exige provedor, DNS, chave externa ou plano comercial novo. A limpeza de acessos e pedidos expirados depende do worker; autorização revogada já é negada na API antes dessa limpeza. A F30 exige configuração adicional descrita abaixo. F10 mantém a pendência anterior de DNS/TLS/provisionamento real.

## Onde ficam e como testar

| Feature | Local | Ensaio mínimo |
| --- | --- | --- |
| F24 — Descoberta de páginas | Menu público **Páginas** (`/paginas`); opt-in em Minha página → Dados da página | Publicar uma página elegível, ativar **Encontrar minha página** e consultar com outra conta. Filtrar, seguir, deixar de seguir. Desativar descoberta e confirmar que some. Rascunhos não aparecem. |
| F30 — Integrações e avisos | Painel → **Integrações e avisos** (`/painel/integracoes`) | Criar destino HTTPS público, escolher eventos, guardar o segredo mostrado uma única vez e usar **Testar envio**. Conferir entregas e desativar. O receptor deve validar assinatura e deduplicar o evento. |
| F35 — Atendimento de contatos | Minha página → **Contatos recebidos** → **Atender** | Enviar formulário pela página pública, abrir contato, mudar Novo → Em atendimento → Concluído, incluir nota interna, reabrir e conferir filtros/histórico. Exportar exige permissão própria. |
| F39 — Idiomas | Minha página → Edição → **Idiomas** (`/painel/perfil/idiomas`) | Configurar idioma principal e traduções manuais em inglês/espanhol; testar prévia, publicar e trocar idioma na página pública. Campo vazio usa o texto original. Não traduz URLs nem usa IA externa. |
| F26 — Comparar botões | Minha página → Resultados e divulgação → **Comparar botões** (`/painel/perfil/testes`) | Com plano elegível e medição ativa, escolher botão comum, definir dois textos, salvar e publicar pela moderação habitual; iniciar teste. Duas sessões com consentimento podem receber variantes. Interromper e aplicar uma opção altera só o rascunho. Não forçar vencedor: há prazo e amostra mínimos. |
| F36 — Clientes e agência | Painel → **Clientes** (`/painel/clientes`), **Acessos por cliente**, **Transferir página** | Seguir os três ensaios abaixo. |

### F36: organizar e alternar clientes

1. Abrir duas contas em navegadores/perfis separados: agência e cliente. O cliente mantém sua própria conta e página.
2. Na conta do cliente: **Equipe → Acessos por página → Convidar colaborador**. Informar o e-mail da agência, escolher Leitor ou Editor, criar e compartilhar o link do convite. A agência deve entrar com o e-mail convidado e aceitar.
3. Na agência: **Clientes → Adicionar cliente**, escolher a página autorizada e dar um nome ao cliente. Repetir com outro cliente se quiser conferir o isolamento.
4. Abrir **Editar página** ou **Consultar página** e confirmar o nome correto. Alterar um cliente não deve alterar o outro. **Métricas deste cliente** identifica a página consultada; só mostra resultados quando o plano do cliente permite e há medição/dados. O colaborador não ganha o direito de ativar a medição.
5. Remover do portfólio não apaga a página. Revogar o acesso pelo titular impede novas consultas/edições e oculta dados privados no portfólio.

Limite técnico atual: dez clientes ativos por agência, sem cobrança adicional pelo portfólio. Cada cliente mantém sua assinatura existente. Não foi criada assinatura agregada de agência.

### F36: permitir que a equipe da agência atenda um cliente

1. Adicionar a pessoa à equipe global da agência pela **Equipe** existente. Na seção **Clientes**, conceder leitura e, se necessário, escrita. Isso permite usar o portfólio; não libera páginas dos clientes automaticamente.
2. O titular da agência abre **Clientes → Acessos por cliente → Solicitar acesso para a equipe**, escolhe cliente, pessoa e Leitor/Editor.
3. O próprio cliente abre **Clientes → Acessos por cliente** em sua conta e aprova ou recusa o pedido.
4. A pessoa autorizada usa o espaço da agência e vê somente os clientes liberados. Revogar a pessoa da equipe global, o acesso da agência à página ou arquivar o cliente encerra a concessão derivada. Uma concessão direta posterior do titular é independente.

Pedidos pendentes expiram em sete dias. A concessão aprovada continua vinculada às versões das permissões; uma alteração de vínculo exige nova aprovação, em vez de ampliar direitos silenciosamente.

### F36: transferir a página

1. Usar duas contas confirmadas no mesmo tenant. O destinatário precisa estar ativo e **não ter página própria**.
2. O dono atual abre **Clientes → Transferir página → Transferir minha página**, informa o e-mail e confirma o aviso sobre dados e cobrança. O pedido vence em sete dias.
3. O destinatário abre **Clientes → Transferir página → Receber página**, lê e aceita a confirmação. Se o rascunho mudou desde o pedido, criar novo pedido atualizado.
4. Conferir página/URL, publicação, histórico e contatos no novo titular. O antigo titular perde o acesso; equipe e convites anteriores são revogados. Descoberta e medição ficam pausadas e testes de botões são encerrados; o novo titular precisa revisar essas configurações.

Transferência é uma mudança real de titularidade, não uma prévia. Testar primeiro com dados fictícios. Assinaturas, faturas, links do catálogo, convites independentes e integrações ficam na conta original; não há cancelamento nem movimentação automática de cobrança. Benefícios pagos dependem do plano do novo titular. Canais que dependem de convites independentes do antigo titular podem ficar indisponíveis. Fotos atuais são copiadas; versões antigas continuam seguindo a política anterior de não preservar fotos removidas.

## Configuração adicional da F30

`WEBHOOK_ENCRYPTION_KEY` está ausente no `.env` local inspecionado. Configurar **a mesma chave de 32 bytes em base64** na API e worker antes de criar destinos. Gerar em gerenciador seguro; não colar em documentação, frontend ou Git. Não trocar a chave mestra após cifrar destinos sem reencifrar os dados. É diferente do segredo de assinatura de cada destino, que o painel permite rotacionar.

Testes automatizados usaram receptor sintético local. Nenhum aviso foi enviado a um endpoint real de cliente nesta rodada.

## Limites e retomada

Os resultados de checks e as capturas ficam nos registros `execucao-f24.md`, `execucao-f30.md`, `execucao-f35.md`, `execucao-f39.md`, `execucao-f26.md` e `execucao-f36.md`. A próxima implementação é **F40**, seguida de **F41**, somente após nova autorização para continuar. Não confundir S0–S6 local com CI, liberação S7 ou produção.
