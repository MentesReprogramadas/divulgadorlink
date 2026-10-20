# F10 — Operação e validação de subdomínios

Implementação local na branch codex/roadmap-f37-testes. Nenhuma alteração de Coolify/DNS/certificado, venda ou deploy foi executada. Este roteiro prepara a liberação; não é evidência de infraestrutura pronta.

## Configuração

1. Aplicar migrations expansivas até 20261020110000_profile_hosts antes da versão nova. Nenhum dado existente é apagado. O teste usa PG descartável; não aponta automaticamente para seu banco de desenvolvimento ou produção.
2. Definir a mesma PROFILE_HOST_BASES na API e no frontend, em JSON. Default `{}` mantém a entrada sem provisionamento e impede vender a capacidade no tenant sem raiz. Exemplo de uma raiz controlada: `{"paginas.temlinkaqui.com":"temlinkaqui.com"}`. O valor deve ser o host exato de um tenant existente; não cria tenant por usuário. Não usar domínio de cliente, IP ou wildcard literal. TENANT_HOST no frontend deve continuar vazio para múltiplos hosts.
3. Apontar `*.paginas.temlinkaqui.com` ao proxy que serve este frontend, preservando Host. Configurar HTTPS/443 e redirecionamento HTTP→HTTPS no proxy. Wildcard cobre um nível; não abrir nomes operacionais ou raiz como perfis. A aplicação não aceita X-Forwarded-Host como identidade de perfil.
4. Emitir e manter certificado válido para a raiz wildcard ou cada endereço pelo processo da plataforma. Wildcard ACME exige DNS-01; não colocar credencial DNS no frontend. [Referência Let's Encrypt](https://letsencrypt.org/docs/challenge-types/).
5. Validar em staging antes de habilitar vendas. F11 conserva seus gates de provedor, preço em centavos/Price versionado, fiscal e capacidades entregues. Nenhum preço foi criado. Um plano precisa incluir `profile.subdomain`; papel ADMIN ou cookie não substitui o benefício.

## Uso e ensaio local

Minha página → Endereço próprio. Crie a página, confirme o e-mail, publique pelo fluxo existente e tenha cobertura paga válida. Escolha um nome, reserve, use Ver prévia da página para conferir o rascunho e Verificar HTTPS para ativar. A prévia é a mesma da F19; edição de aparência, serviços/links e formulário permanecem nas telas atuais. A capa usa cores do tema; não é um novo upload. A ativação consulta o endpoint `/.well-known/temlink-page/<prova>` por HTTPS com certificado válido, DNS fixado e sem redirects. PENDING e falha nunca significam página publicada no host.

Para testes automáticos, o harness cria banco/Redis, tenant checklist.localhost, assinatura fixture e raiz pages.localhost. O entrypoint backend/scripts/e2e-profile-hosts.ts usa apenas a prova HTTP da própria aplicação descartável. Ele é recusado em produção e não é o adapter TLS real. Não habilitar esse entrypoint no serviço de produção. As URLs e fixtures do harness não são dados para cadastrar manualmente no banco pessoal.

## Gate obrigatório em staging — pendente

- [ ] Certificado público com cadeia, SAN/SNI e validade corretos, sem ignoreHTTPSErrors; DNS resolve só IPs públicos esperados.
- [ ] Reserve um nome antes de configurar certificado: Verificar HTTPS falha, continua PENDING, sem sucesso falso; corrija a infraestrutura e confirme ativação real.
- [ ] Host A exibe somente publicação A; outro host/perfil/tenant, host desconhecido e nome operacional não abrem a página. APIs privadas e autenticação no host pessoal retornam indisponível.
- [ ] Cookies de sessão do painel são host-only, sem Domain pai; acesso ao host pessoal não os recebe nem ganha sessão por BFF. [Semântica de cookies host-only](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).
- [ ] Idade, formulário, imagem, calendário e canais funcionam. Canais, detalhe do catálogo e outras superfícies públicas auxiliares abrem sua rota central; não concedem login no host pessoal. Recusar idade volta ao catálogo central.
- [ ] Cancelar renovação preserva saldo pago; após expirar, 307 para página básica; nova assinatura/cobertura retoma o host. Renomear mantém antigo ativo até o novo passar HTTPS; antigo fica reservado e encaminha ao básico. Desativar retorna 404.
- [ ] Mobile/teclado, cache no-store, canonical raiz, noindex e ausência de outro catálogo no sitemap do host conferidos no endereço real.

## Reversão sem perder endereços

Desabilitar novas reservas/vendas e manter leitores compatíveis, dados e reservas. Para retirar um host, usar desativação explícita; não apagar profile_host_names. Manter mapa no frontend enquanto o proxy ainda encaminhar esses hosts, garantindo 404 em vez de cair numa rota comum. Só remover a allowlist do frontend após retirar o encaminhamento wildcard. /p/slug básico permanece independente. Não reverter para parser antigo estrito após publicar coverStyle: conservar suporte ao campo, mesmo desativando a edição. Não resetar banco nem liberar nome de outro dono.

## Proteção dinâmica de nomes da infraestrutura — 2026-10-20

Antes de implantar esta versão com PROFILE_HOST_BASES ativo, configurar no backend COOLIFY_API_URL (origem HTTPS do Coolify, sem /manager), COOLIFY_API_TOKEN, COOLIFY_PROFILE_ROUTER_UUID, CLOUDFLARE_DNS_API_TOKEN e PROFILE_HOST_DNS_ZONES. Token fica somente no backend e deve ler todos os servidores/recursos relevantes da equipe; não cadastrar token de outra integração. O UUID identifica a aplicação frontend que serve o wildcard das páginas. Sem ele, wildcard ocupado é bloqueado conservadoramente. Não usar token limitado a um subconjunto e presumir cobertura global de outras equipes.

A cada reserva, antes/depois da prova HTTPS e na resolução pública, consultar inventário atual sem cache persistente. Novas reservas verificam conta/plano/tenant antes de consultar o provedor; autorização e cobertura são conferidas novamente na transação. Aplicações, Docker Compose, serviços, previews, domínios por servidor e host do próprio Coolify têm prioridade. Recursos parados continuam protegidos enquanto mantiverem domínio cadastrado. Remoção libera a restrição de infraestrutura na próxima operação; reservas anteriores de usuários mantêm sua titularidade pela regra F10 existente. Não cria ou remove DNS pelo Coolify.

Somente o wildcard exato da raiz configurada, pertencente ao UUID explícito do roteador das páginas, recebe exceção. Domínios exatos desse mesmo recurso continuam bloqueados; mesmo wildcard de outro aplicativo, serviço ou preview também bloqueia. Qualquer consulta parcial, formato inesperado, timeout, redirect, credencial ausente ou falha retorna indisponível (503), sem assumir nome livre. Colisão em reserva/ativação: 409. Na leitura pública: 404, sem dados do perfil conflitante. Após remover colisão, uma publicação ativa volta a resolver sem apagar histórico ou reserva.

Timeout total do inventário: 5 segundos, limite de 2 MB por resposta. Esse modo aumenta latência e chamadas à API; limite de requisições do provedor também fecha a disponibilidade. Não há transação distribuída com o Coolify: uma alteração após a consulta pode acontecer antes do commit; a resolução subsequente consulta novamente. A API da Cloudflare complementa o inventário com registros DNS exatos, independentemente do tipo. Labels manuais de proxy não expostas pelo inventário e sem registro DNS específico, recursos de outras equipes e zonas de outro provedor não ficam automaticamente cobertos. Não é correto inferir registro livre apenas por resposta pública quando há wildcard.

Fontes primárias consultadas: [domínios por servidor](https://coolify.io/docs/api/endpoints/servers/get-domains-by-server-uuid), [aplicações](https://coolify.io/docs/api/endpoints/applications/list-applications), [previews](https://coolify.io/docs/api/endpoints/applications/list-preview-deployments-by-application-uuid) e código do ServersController no repositório coollabsio/coolify. Context7 e MCP Coolify falharam por conexão nesta sessão; documentação oficial via web foi a alternativa.

Gate real pendente: MCP https://coolify.temlinkaqui.com/mcp inacessível em duas tentativas; backend local não possui credenciais COOLIFY nem CLOUDFLARE. Não foi configurado token, DNS, serviço remoto ou deploy. Validar a versão instalada, acesso a todos os recursos, UUID do roteador, inclusão/remoção de um hostname de teste e falha controlada do provedor antes de liberar em produção. Sem credenciais, a proteção permanece fechada. Reversão conserva inventário e reservas; não retirar o guard sem desabilitar primeiro a disponibilização de subdomínios.

### DNS autoritativo Cloudflare

Consulta NS pública em 20/10/2026 encontrou lady.ns.cloudflare.com e henry.ns.cloudflare.com para temlinkaqui.com. Implementado adapter de leitura Cloudflare, chamado em paralelo ao guard Coolify nas mesmas decisões. Configurar token restrito com Zone:Read e DNS:Read, e PROFILE_HOST_DNS_ZONES como JSON raiz→Zone ID (32 caracteres hexadecimais), por exemplo {"paginas.temlinkaqui.com":"<Zone ID de temlinkaqui.com>"}. O placeholder é instrutivo; não é um identificador real. Nada disso vai para frontend/NEXT_PUBLIC.

A consulta usa GET /zones/:id para conferir zona ativa compatível e GET /zones/:id/dns_records com name.exact e per_page=1 para o hostname completo. Qualquer registro exato protege o nome; wildcard de roteamento não é considerado registro específico. Delegação NS em qualquer ancestral entre raiz configurada e zona impede consultar uma zona pai equivocada: configurar o Zone ID autoritativo correto. Inclusão/remoção reflete na próxima operação, sem cache positivo/negativo. Falha de um dos dois provedores não libera hostname. Nomes operacionais e reservas de titulares anteriores continuam protegidos. Timeout DNS de 5 segundos, 200 KB por resposta, TLS normal e redirects recusados; sem alteração ou exclusão de registros.

Fonte primária: [Cloudflare — List DNS Records](https://developers.cloudflare.com/api/typescript/resources/dns/subresources/records/methods/list/). Credenciais/Zone ID não estão disponíveis nesta sessão; integração real permanece pendente. O modo local normal também bloqueia F10 até ambos os provedores estarem configurados; E2E usa composição isolada explícita, nunca um bypass acionável pelo usuário.
