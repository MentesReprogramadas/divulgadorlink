# Backend — revisão antes de publicação, 30/10/2026

Escopo: Shopee, política de grupos/aprovação, convites armazenados e compactação de títulos. Árvore revisada sobre HEAD `d8374eef`, preservando arquivos já modificados. A raiz informou que `origin/main` avançou para `56c6c69f`, incluindo convites/títulos; integrar a main antes de selecionar o diff final. Esta revisão não fez commit, push ou deploy.

## Resultado

- `npm run lint`: aprovado.
- `npm run typecheck`: aprovado.
- `npm run build`: aprovado.
- Domínio, adaptadores e casos de uso de afiliados, mais HTTP catálogo/produtos: **194 testes aprovados; 1 ignorado preexistente**, 25 arquivos aprovados.
- PostgreSQL: **88 testes aprovados em 7 arquivos**, cobrindo catálogo, descoberta, Shopee, política de grupos, operações, prévia/aprovação idempotente e HTTP administrativo/público.
- `git diff --check -- backend`: sem erros de whitespace; apenas avisos locais de normalização CRLF.

## Correção concreta encontrada

A criação remota de um grupo podia aplicar a política do snapshot inicial e devolver o convite após uma alteração concorrente da política. A regressão PostgreSQL reproduziu o problema: a promessa resolveu um convite quando deveria bloquear.

`invitations.ts` agora confere o hash exigido pela configuração atual antes de liberar o convite. Se a configuração mudou, o grupo conhecido permanece registrado, com política pendente e provisionamento IDLE; retorna conflito e não se apresenta como criação remota incerta. O GET também permanece bloqueado até o worker aplicar a política atual.

Três casos PG cobrem mudança de duração, ativação de aprovação e ativação da política durante a criação. Foi adicionada à allowlist do teste de produto a identificação exata do novo banco descartável; a restrição a host local foi preservada.

Arquivos alterados por esta revisão:

- `backend/src/use-cases/affiliates/invitations.ts`
- `backend/src/use-cases/affiliates/group-policy.pg.spec.ts`
- `backend/src/use-cases/affiliates/product-review.pg.spec.ts` — somente allowlist do banco de teste
- Este relatório

## Banco e migrações

Criado banco próprio `affiliate_predeploy_regression_20261030` no container local de preview já existente, porta 5638. As **85 migrações** foram aplicadas do zero com sucesso, em schema public. Nenhum container foi interrompido; não foram usadas portas HTTP/E2E.

As três migrações pendentes são aditivas: novos campos com defaults, tabela de pedidos de entrada e índices. Não há remoção de tabelas/colunas nem alteração de credenciais. A política de grupos tem default false, sem ativação automática para segmentações existentes. A tabela de admissões usa chave estrangeira composta de grupo/tenant e chave única por participante no grupo.

Uma tentativa auxiliar de executar o teste com nome de banco antigo em schema isolado falhou no tipo vector, que já existia em public fora do search_path do schema novo. O schema auxiliar criado por esta revisão foi conferido e removido; public não foi alterado. O teste foi executado com sucesso no novo banco próprio após permitir seu nome explicitamente. Essa falha local não ocorreu na aplicação limpa das 85 migrações.

## Proteções verificadas

- Credenciais Shopee criptografadas por tenant/provedor, status/audit sem segredos e comparação da configuração durante geração.
- Origem fixa da Open API, timeout, limite de resposta, validação de URL/imagem e não exposição de mensagens livres do provedor.
- Cache removido na troca de fonte; IDs de produto separados; prévia vinculada ao tenant/ator/segmentação/configuração e aprovação idempotente.
- Rotas administrativas exigem conta administrativa ativa do mesmo tenant, sem sessão compartilhada/suporte.
- Convites armazenados continuam sujeitos a grupo/segmentação ativos, capacidade registrada e validação do destino; pausa concorrente bloqueia liberação.
- Política exige conexão aberta, capability autenticada, lease no banco, atraso mínimo de 120 segundos e registro UNCERTAIN para não repetir aprovação de resultado incerto.
- Compactação preserva números, unidades e qualificadores; preço/link e conteúdo aprovado permaneceram cobertos por testes.

## Lote backend pronto para integração da raiz

Agrupar os arquivos já pendentes de `backend/prisma/schema.prisma` e das três migrações; adaptadores `evolution`, `shopee`, `openai-intelligence` e seus testes; domínio `contracts`, `mercado-livre`, `shopee`, `group-policy`, `product-title` e testes; controllers administrativos de afiliados/catálogo/produtos e testes HTTP; casos de uso catálogo, descoberta, Shopee, grupos, convites, prévia de produto e testes; integração do worker.

Convites armazenados e títulos têm equivalentes já publicados na main informada. Não reverter nem republicar por suposição: reconciliar o diff após integrar essa main, preservando o novo guard de política. A extensão em `integrations/evolution` é um artefato separado e não foi instalada/publicada por esta revisão.

## Limites e reversão

As APIs externas foram simuladas nos testes. Não foram usados segredos de produção nem feitas aprovações/envios no WhatsApp. Não houve reinício, conexão ou instalação na Evolution real. A extensão de aprovação ainda depende da publicação própria; sem capability o app informa UNSUPPORTED e não simula sucesso.

Build/HTTP autenticado da extensão foram relatados pelo responsável pela integração; socket real não faz parte destes checks. Validação visual/E2E de frontend e atualização final do Graphify pertencem à raiz. Esta revisão não valida produção.

Reversão da correção local: remover somente o novo guard/regressões descritos acima, preservando as alterações anteriores. Para recurso de grupos, a opção enabled permite mantê-lo desativado; migrações aditivas não exigem derrubar tabelas durante um rollback de aplicação.
