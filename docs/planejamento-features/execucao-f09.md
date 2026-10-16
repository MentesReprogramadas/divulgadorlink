# Execução F09 — perfil público

Estado em 16/10/2026: **CONCLUÍDA NA BRANCH codex/roadmap-features**. Código final aba5b14907ec5d4bb794266b768cd282470a3d20; [CI 38940575906](https://github.com/MentesReprogramadas/divulgadorlink/actions/runs/38940575906) aprovado em verify, web, images e e2e. Documentação posterior não muda o código. Parada após F09, conforme solicitado; F12 e seguintes não iniciadas. Sem main, deploy, Coolify, envio ou cobrança real.

## Decisão e escopo

O preparo inicial 95b40ec registrou o bloqueio de D10 e contratos isolados. O usuário resolveu a regra: **“Validação automática; bloquear conteúdo suspeito e manter rascunho para correção”**. A implementação foi retomada com essa decisão. Não há fila de revisão humana de perfil, nem conversão silenciosa de ProfileItem em Link do catálogo.

Aba Perfil em /painel/perfil e página pública SSR /p/:slug no tenant atual. Identidade com nome, bio e foto; grupos pessoais, URLs próprias, redes sociais, referências aos próprios links publicados no catálogo, ordem, visibilidade e botão principal. Prévia privada usa a mesma projeção e o mesmo ProfileView público. Templates, subdomínio premium, assinatura, histórico restaurável, compartilhamento de coleções e analytics por bloco continuam nas respectivas features futuras.

## Contratos, publicação e autorização

GET /api/v1/me/profile retorna draft e publishedVersion; PATCH recebe content e expectedVersion. CRUD e reordenação de categorias/itens são uma atualização atômica do agregado, substituindo os endpoints independentes propostos. GET /me/profile/preview; POST /me/profile/publish e /unpublish; POST /me/profile/avatar; GET privado /me/profile/avatar/:id e público /profiles/:slug/avatar/:id. GET /profiles/:slug é anônimo. Detalhes e limites na [spec reconciliada](specs/f09-perfil-publico.md).

Tenant vem do host; dono vem do access JWT válido e é revalidado no banco como ACTIVE. ADMIN não recebe acesso ao perfil de outro dono. E-mail confirmado/canSubmit é exigido para publicar; rascunho não dá permissão de publicação. CSRF e BFF existentes são preservados. Nenhum campo ownerId/tenantId é aceito no corpo. Erros retornam envelope code/message/request_id; logs inesperados guardam código seguro, sem SQL, nomes, conteúdo ou parâmetros privados.

Slug identifica o perfil, não o nome de exibição: único por tenant, 3–40 caracteres ASCII, caixa e espaços externos normalizados, nomes reservados recusados. Publicado exige retirar do ar antes de mudar endereço. Isso mantém o snapshot público estável durante edição. Não há subdomínio/tenant por usuário.

Escritas bloqueiam a linha do dono. Save usa versão otimista; repetição do mesmo conteúdo é no-op e devolve versão atual. Publicação valida o snapshot fora da transação longa e confirma novamente versão, dono, referências e foto na transação final. Repetir a publicação da mesma versão já publicada não cria outra revisão. Retirar do ar incrementa versão; repetir retirada é no-op, mas publicar com a versão anterior recebe 409. Isso impede uma requisição antiga de ressuscitar a página. Falhas mantêm rascunho e publicação anterior; UI salva rascunho antes de solicitar publicação.

## Conteúdo, mídia e privacidade

URLs próprias exigem HTTPS público antes de canonicalUrl, sem credenciais/portas especiais; probe reutiliza DNS e redirecionamento seguros. Bloqueios por tenant e destinos ligados a contas banidas também são aplicados. O adapter OpenAiTextModeration foi reutilizado com judgeProfile e instrução específica; a instrução original do catálogo permanece intacta e tem regressão. Categorias pessoais não são comparadas com Niche. Limiar vem de MODERATION_AUTO_APPROVE_THRESHOLD. Suspeita/baixa confiança retorna 422; configuração ausente, timeout, erro ou resultado inconclusivo retorna 503. Todos os campos e itens do rascunho, inclusive ocultos, são validados antes da publicação. Probes têm até quatro chamadas simultâneas e orçamento de início de 25 segundos; chamadas já iniciadas conservam timeout próprio. Nada vira aprovado por indisponibilidade do provedor.

Referência CATALOG exige link próprio do mesmo tenant e publicado; publicação do perfil não cria Link, Niche, Network ou slot. Na leitura pública, catálogo é revalidado para status, tenant de rede/nicho e suspensão do dono; referências inelegíveis somem sem destino ou metadados. Snapshot guarda somente campos públicos e conteúdo visível. Rascunhos, grupos/links ocultos, contatos de conta e credenciais não são serializados. Restrição considera perfil, rede ou nicho das referências visíveis: antes do aceite, API e SSR devolvem somente restricted=true; sem nome, bio, foto ou itens. Foto pública só é servida quando pertence ao snapshot atual e a página está elegível.

Porta ProfileMedia com adapter PostgreSQL, pois não existia armazenamento de mídia; nenhum provedor, biblioteca ou credencial nova. Browser aceita PNG/JPG/WebP até 5 MiB e normaliza/redimensiona sem enviar o original/EXIF. Servidor recebe PNG RGB/RGBA até 512 px e 256 KiB, confere assinatura, chunks, CRC, dimensões, inflate limitado e filtros; reencoda sem metadados. Assets têm chave por tenant/dono/hash. Guardam-se foto do rascunho, da publicação e upload recente; fotos sem referência são removidas na próxima limpeza. Conta excluída remove assets/perfil por FK. Não há classificação semântica de imagem por IA nem promessa de inspeção completa do conteúdo remoto ou segurança futura de uma URL que pode mudar.

Respostas privadas e públicas usam no-store. Canonical e SSR próprios, noindex no MVP; sitemap/descoberta existentes não foram ampliados (F24). Caminhos de catálogo/go, patrocinados, surfaceToken, consentimento e atribuição não mudam. Tráfego público de perfil segue a agregação existente /outros no servidor; não há identificação por slug nos agregados nem novo evento publicitário. Contagem de perfis publicados/atualizados é possível no banco; compartilhamentos, cliques por botão e retorno individual à edição não foram instrumentados silenciosamente (F31).

## Reuso e validação visual

AreaFrame/PanelNav para sessão e estrutura; Button/Field/Input/TextArea/Select para controles; ErrorState para recuperação pública. App apenas compõe rotas/metadados; features/profiles mantém carregamento, transporte e interação; ProfileFields recebe callbacks/dados, sem sessão/HTTP; ProfileView é apresentação compartilhada. CSS Modules e tokens existentes, sem fontes ou bibliotecas novas. MoveProfileItem puro fica em frontend/domain e é usado pelos controles de grupos e links; o helper backend inicial foi removido ao reconciliar a responsabilidade, evitando lógica sem consumidor.

Referência dominante: identidade Tem Link Aqui e seus formulários. [Linktree](https://linktr.ee/templates) foi lido/inspecionado no Chrome para coluna de identidade, avatar e nome; a página consultada não comprova editor ou categorias. [GOV.UK Summary list](https://design-system.service.gov.uk/components/summary-list/) foi lido para resumo/ações, sem inspeção visual dessa segunda referência. Refero indisponível entre as ferramentas da sessão. Não se copiou identidade externa. Skills temlink-components e temlink-ui-validation orientaram implementação e revisão.

Chrome real verificou 1280×720 e 390×844 touch: formulário com largura 760/324 px, labels associadas, foco azul 3 px/offset 3 px por Tab, um h1 público e ausência de overflow/sentinela. Texto secundário rgb(92,107,127) em branco: contraste 5,43:1; ação principal branco/navy. Revisão identificou legenda redundante e hierarquia na prévia, corrigidas com CSS local e títulos h2/h3/h4 coerentes. Preview e público finais foram capturados pelo Playwright e as imagens abertas para revisão; foto aguardada após scroll para respeitar lazy loading. A tentativa de aguardar decode fora da viewport foi interrompida, a aba de revisão encerrada e não é usada como evidência concluída. E03 verifica 320 px com texto raiz 200%; isso não equivale a zoom nativo integral, aparelho físico, leitor de tela ou certificação de acessibilidade. Novo caminho não tinha baseline funcional comparável; sem alegação de melhora de performance/conversão ou diff pixel a pixel.

## Testes e falhas registradas

RED antes da implementação: normalização/ordem, projeção e renderer, com módulos carregados e falha de comportamento. Os testes de estado do editor e garantias de banco foram acrescentados na integração; não se afirma que todo caso foi executado vermelho. U02 foi reconciliado para o domínio frontend usado pelos dois controles. U04/U05 têm também prova PG de ausência de criação de catálogo/facetas. C cobre vazio, falha, preservação de rascunho, envio duplicado, confirmação posterior ao servidor e retry público.

HTTP/PG no mesmo arquivo real: disputa de slug com um 200/um 409 e mesmo slug em outro tenant; dono/admin/visitante/tenant/suspensão; prévia/publicação/rascunho/retry; URL privada/protocolo/credenciais/destino morto; bloqueio textual, suspeita e indisponibilidade; conflito durante validação; FKs negativas de categoria e catálogo; publicação sem versão recusada no banco; rollback por triggers, inclusive falha após reinserção dos itens; imagem inválida, isolamento de asset, confirmação de e-mail, retirada e replay antigo; idade por rede e referência indisponível; CSRF real. Redis entra na regressão existente, sem job artificial para F09.

E01 cria dois grupos e item oculto, ordena, configura rede/botão, envia PNG/JPG/WebP, confere imagem decodificada na prévia e no público, publica e recarrega. E02 verifica login/ADMIN de outra conta, suspeita/provedor e publicação anterior preservada/retirada. E03 usa offline real, teclado, duas abas com conflito e 320 px/texto 200%. E04 verifica HTML/API sem conteúdo antes do aceite de idade e liberação posterior real. API/BFF/banco reais; somente provedor externo usa stub local, restrito a NODE_ENV=dev e tenant profiles.localhost, ignorado em produção.

Primeiro PG falhou por fixture PNG ausente: gerada com biblioteca padrão, sem dependência instalada. Primeiros E2E falharam por locator de alerta que também encontrava o anunciador do Next e por mensagem que não explicitava rascunho preservado; corrigidos escopo do locator e texto. Execução interrompida durante setup está separada e não vale como aceite. Logs vermelhos/verdes preservados; traces autenticados não foram versionados.

| Verificação final | Resultado |
| --- | --- |
| Backend lint/typecheck/build e unitários | Aprovados; 424 testes, 101 arquivos |
| Frontend lint/typecheck/build e unitários | Aprovados; 196 testes, 59 arquivos |
| PostgreSQL/Redis | 137 testes, 14 arquivos; dez HTTP/PG F09 |
| Playwright completo | 92 aprovados; sem skip/retry |
| Recorte final F09 desktop/mobile | 9 aprovados, incluindo setup; PNG/JPG/WebP e foto da prévia |
| CI do código aba5b14907ec5d4bb794266b768cd282470a3d20 | 38940575906; quatro jobs aprovados e contagens conferidas nos logs |

Comandos: backend npm run lint/typecheck/test/build/test:pg; frontend npm run lint/typecheck/test/build/test:e2e e npx playwright test profiles.spec.ts. PG_SPECS=1 e URLs locais descartáveis; E2E_PORT_OFFSET=100 e E2E_RUN_ID=roadmap. A extração pura U02 e recuperação pública foram verificadas por testes afetados/recorte final e pelo CI completo do código final. Evidências em evidencias/F09/2026-10-16; contagens de CI e JSON sem cookies/secrets/traces.

## Migração, reversão e parada

Migration 20261016160000_public_profiles aditiva: Profile, ProfileCategory, ProfileItem e ProfileAsset; identidade/owner/tenant e posições únicas, FKs compostas e checks de publicação/tipo de destino. Sem backfill ou alteração de dados antigos. Clone f09_final_migration_proof recebeu o SQL final exato; fingerprints das 38 tabelas anteriores permaneceram iguais e tabelas novas começaram vazias. Fixtures de 10 mil perfis e mil grupos mostraram uso natural de profiles_tenant_slug_key, profiles_tenant_owner_key e profile_categories_position_key. O banco local inicial de desenvolvimento recebeu os ajustes do DDL durante a iteração; a prova final e os harnesses começaram do schema anterior e aplicaram a migration final limpa, sem reset de dados antigos.

Consulta de catálogo existente e inalterada retornou seis linhas no schema expandido, preservando contagens de perfis, grupos, links, promoções, favoritos e coleções. Não foi executado o binário completo da aplicação antiga. Rollout futuro por ambientes: migration aditiva, build compatível, ensaio em staging/contas piloto e autorização específica de produção. Sem flag numérica improvisada. Rollback por código retira aba/rotas/renderer e mantém tabelas/assets para recuperação; não apagar perfis nem resetar banco. Produção não foi publicada.

AC01: U01 e I01/T01 no PG; AC02: I02/T02/CSRF e E02; AC03: C/E01/E03/mobile e revisão visual; AC04: renderer compartilhado e T04/E01 com foto decodificada; AC05: U03/C02/T05/E01, ausência no DTO/DOM; AC06: T06/I01/I03, mídia e E02/E04. Matriz, S0–S7, spec, plano, D10 e inventário encerrados com evidências. **Parar após F09; F12 não iniciada.**
