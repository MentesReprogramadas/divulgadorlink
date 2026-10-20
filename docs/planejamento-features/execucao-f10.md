# F10 — Página premium com subdomínio

20/10/2026. Implementação local na branch codex/roadmap-f37-testes, após F33. Parada nesta feature conforme pedido. Sem push, deploy, alteração de Coolify/DNS/certificado ou criação de preço. Decisões D11/D12 documentam escolhas e alternativas. A implementação local não equivale à liberação pública: HTTPS/certificado/DNS reais em staging e CI continuam pendentes.

## Jornada entregue e reutilização

Minha página → Edição → Endereço próprio. Uma conta com página, e-mail confirmado e cobertura paga válida pode escolher nome e raiz, reservar e verificar HTTPS. Enquanto PENDING, o host não publica conteúdo. Ver prévia da página usa a prévia F19 já existente; não cria editor ou publicação paralela. Conteúdo usa grupos e itens tipados F09, modelos F16, eventos F29 e contato F22. Aparência mantém cores/fontes/botões e ganhou capa visual tipada com as cores do tema, compartilhada entre editor, prévia e público. Serviços são links/grupos já existentes; apresentação usa nome/descrição; contato usa F22. Não foi criado outro upload nem CSS/HTML arbitrário.

A página do host ocupa a tela sem menu/login/painel da plataforma, preservando a marca pequena no rodapé. Na inspeção visual, a capa foi ajustada para uma faixa com avatar sobreposto, evitando parecer outro botão. O gerenciamento conserva ações à direita, cards, campos, Select, Badge, erros e confirmação existentes. Nome permanece no formulário em erro; envio duplicado é bloqueado. Novos ícones têm desenhos distintos de criar link e comprovar domínio. Skeleton de coleção pública foi corrigido para reproduzir o card orgânico, sem ações privadas ou contador inexistente.

## Contratos reconciliados

- GET /me/profile/hosts: estado, versão independente do conteúdo, raízes e capacidade efetiva.
- POST /me/profile/hosts: name/base/expectedVersion. Os themeTokens/typedBlocks propostos continuam nas APIs existentes de perfil, em vez de serem duplicados no contrato de host.
- POST /me/profile/hosts/verify: hostname/expectedVersion; verifica antes de ativar e revalida versão/publicação/benefício/colaborador após a chamada externa.
- DELETE /me/profile/hosts: desativação explícita com versão e confirmação; preserva nome e página básica.
- GET /profile-hosts/resolve: resolver público global. O hostname exato e a raiz configurada no servidor determinam o tenant. Não aceita tenantId, sessão ou Host/X-Forwarded-Host como autoridade de propriedade. Retorna somente hostname, tenantHost, slug e modo PAGE/FALLBACK; prova somente com nonce correspondente.
- /.well-known/temlink-page/:challenge: prova dinâmica, no-store, disponível antes da ativação; sem credenciais.

ProfileHost usa FK composta profileId/tenantId/ownerId, estado SQL restrito, certificado verificado obrigatório em ACTIVE, um ativo e um pendente por perfil. ProfileHostName mantém reserva sem nome/e-mail após exclusão, evitando tomada de URL. Migration expansiva 20261020110000_profile_hosts; perfis e assinaturas anteriores preservados. Lookup público é por chave primária; consulta privada por tenant/perfil. EXPLAIN em fixture pequena escolheu varredura sequencial; não há alegação de ganho de desempenho.

Reserva, mudanças de estado e auditoria são transacionais, serializadas pelo dono, com conflito de versão. Verificação externa ocorre sem manter lock de usuário; a transação final reconfirma estado, publicação e cobertura paga. Para colaboradores globais, reconfirma page.write, vínculo e conta confirmada; revogação durante o probe impede ativação tardia. Auditoria usa o ator real. UI e API respeitam page.read/write; CTA de assinatura não aparece sem billing.read. Sem sessão, outro dono/admin e outro tenant não ganham controle do endereço.

## Endereços, HTTPS, cancelamento e segurança

PROFILE_HOST_BASES é o mesmo JSON no frontend/API, mapeando raiz controlada ao host de tenant existente; default vazio. Um nível ASCII, nomes operacionais reservados, domínio próprio de cliente fora do escopo. Não cria tenant por perfil. Configuração inválida é recusada; sem raiz no tenant, não permite vender essa capacidade, mesmo havendo raiz em outro. F11 mantém gates de provedor, fiscal, preço e período pago; nenhum valor foi inventado.

O adapter de produção reutiliza SafeFetch: DNS fixado, bloqueio de IP privado, SNI/certificado válidos, timeout, corpo limitado e sem redirects; exige conteúdo exato da prova. Cinco reservas e dez verificações por perfil/hora contêm abuso sem alterar quotas comerciais. O entrypoint E2E compõe uma prova HTTP local explícita e é recusado em produção: não comprova cadeia/SAN/DNS público. O gate real está em [operação F10](operacao-f10.md), ainda pendente.

Cancelamento da renovação preserva cobertura até o fim efetivamente pago; PAST_DUE só conserva saldo válido. Após perder cobertura, host já ativado redireciona 307 para /p/slug básico. Renomear mantém o antigo ativo até o novo passar HTTPS; antigo RETIRED encaminha ao básico e continua reservado. Desativação explícita, exclusão ou retirada da página do ar tornam o host indisponível. /p/slug permanece independente do benefício pago.

Middleware sanitiza contexto interno, reconhece somente raízes configuradas e consulta o registro exato. Host desconhecido retorna 404; falha do resolver retorna 503, sem mostrar catálogo por engano. APIs do BFF pessoal são allowlist da mesma página; autenticação, cookies privados, papel e workspace são descartados, inclusive Set-Cookie privado/Domain pai. Consentimento, idade e medições públicas continuam separados por host. Cookies do painel continuam host-only. Detalhes, canais e superfícies públicas auxiliares abrem a rota central; recusar idade volta ao catálogo central. Canonical do host é sua raiz, noindex mantido; sitemap não expõe catálogo de outro contexto. Nada muda na resolução normal dos tenants.

## Critérios e evidências

| AC | Prova local | Pendência |
| --- | --- | --- |
| AC01/T01 | domínio, PG e E01: nomes operacionais, raiz/tenant incompatível, conflito e reserva persistente | CI remoto |
| AC02/T02 | PG/E01/E02/BFF: perfil certo, outro dono/tenant, outra página e cookies forjados; sem dados privados | staging real |
| AC03/T03 | PG/E03: PENDING não serve página; falha não ativa; recuperação exige prova; adapter usa TLS real em produção | **DNS/certificado/HTTPS reais em staging NÃO EXECUTADOS** |
| AC04/T04 | E01: prévia existente, rascunho não público, nova publicação atualiza host; temas/capa/contato compartilhados | CI remoto |
| AC05/T05 | E01–E04 desktop/mobile, teclado, 320px/200%, Axe no painel e público; inspeção visual direta | aparelho/Safari real não foi declarado validado |
| AC06/T06 | PG/E01/E04: saldo, atraso, cancelamento, troca sem quebrar anterior, desativação e anti tomada por outro assinante | staging real |

Frontend completo **466/466**; backend completo **612/612**, incluindo Pix em PG/Redis descartáveis explicitamente configurados. Lint, typecheck e build dos pacotes aprovados; frontend build de produção pelo harness. PostgreSQL final **15/15**: F10 dez e F33 cinco, incluindo FK cruzada com P2003, concorrência, rollback, limites, outro assinante e revogação durante probe. Rodada anterior de regressão em quatro arquivos 37/37 e cobrança 17/17; não somar rodadas sobrepostas.

Playwright final **21/21**, sem skip/retry: quatro jornadas F10, coleções F33 e cenários completos de canais/gestão corrigidos, em desktop/mobile, mais setup. A regressão ampla anterior executou 77: 72 passaram e cinco falharam em asserções antigas. Não é um relatório 77/77: os casos que falharam foram corrigidos e repetidos integralmente na rodada final. Falhas: texto também presente na prévia inerte (locators agora restritos ao editor); lista antiga sem Evento da F29; exigência de duas colunas pelo viewport mesmo com prévia lateral (agora valida a grade e os limites do contêiner). Conteúdo e persistência não foram afrouxados para passar testes. Demais fluxos de contato, cobrança, perfis, canais e eventos passaram na rodada ampla. Relatórios e traces anteriores preservados.

Primeira rodada vermelha de domínio capturada antes da regra (3 falhas). Componentes foram testados depois da composição: não existe prova de red prévio desses componentes; registrar a diferença de sequência, sem fabricar TDD retroativo. Primeiro E2E teve fixture sem Price/Product, recusada pela constraint financeira; corrigida a fixture. Segundo revelou fetch descartando Host: resolver passou a derivar identidade do hostname registrado; prova descartável usa transporte nativo. Inspeção de PNGs finais confirmou página inteira, capa, rodapé pequeno, estados do painel e mobile. Logs finais copiáveis, relatórios JSON e hashes ficam nas evidências desta execução.

## Operação e reversão

[Configuração, ensaio e checklist de staging](operacao-f10.md). Aplicar migration e API compatível antes do frontend; reiniciar serviços após configurar envs. Não remover mapa do frontend enquanto o proxy ainda encaminhar hosts pessoais: desativar registros primeiro para continuar respondendo 404. Preservar reservas e leitores de coverStyle/histórico no rollback; não resetar banco nem reverter para parser estrito antigo. Nenhuma migração no banco pessoal ou produção foi executada.

S0–S6 automatizados localmente, com a ressalva de sequência S1 acima. AC03 permanece parcial e S7 em revisão: TLS/DNS reais, CI e liberação comercial não foram executados. Parada após F10 cumprida; não iniciar F24 nem outras features.

Commit de implementação: 6694ce0d7325345f842c4f8c5e684b180a98e63c.

## Proteção de infraestrutura — 20/10/2026

F10-AC07 implementado localmente: inventário Coolify + DNS autoritativo Cloudflare, leitura sem cache e falha fechada em reserva/ativação/resolução. Configuração, decisões, exceção estrita do roteador e limites em [operação](operacao-f10.md). Credenciais reais indisponíveis: MCP Coolify e Context7 falharam por conexão; nenhuma env de produção, token, DNS ou deploy foi alterado. Dados anteriores/assinaturas/reservas foram preservados, sem migration nova.

Validação: 13/13 testes unitários backend (adapters Coolify/Cloudflare e domínio de hostname); 11/11 PG contra container descartável localhost:5946. A ordenação inicial do pré-check alterou erro de conta sem página para 403; teste capturou, restaurado o contrato 400 antes de fechar. Suíte E2E conjunta F10/F32: 23/23 desktop/mobile; repetição dirigida F10-E05/F32-E06: 5/5, incluindo setup. E2E tem composição de infraestrutura sintética explícita, não prova acesso às APIs reais. Uma repetição não iniciou API/worker no Windows; repetição posterior passou. Lint, typecheck e build backend passaram. Frontend lint/typecheck e build com TEMLINK_E2E_BUILD=1 passaram, sem encerrar servidor local. Containers próprios de PG/Redis removidos ao finalizar. F10-M01 real e AC07 nos provedores reais seguem pendentes.
