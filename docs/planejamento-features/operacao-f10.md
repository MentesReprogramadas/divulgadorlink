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
