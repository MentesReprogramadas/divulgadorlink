# Afiliados local: integrações reais e recuperação CSRF

> Registro histórico da primeira configuração. A geração nova, o painel e a validação posteriores estão em [Afiliados: jornada e geração automática](2026-10-28-afiliados-jornada.md); a limitação de geração/cache descrita abaixo foi superada pela validação da resposta autenticada.

O usuário autorizou configurar as integrações reais do VHG e esclareceu: **não reutilizar suas instâncias nem grupos; os testes WhatsApp começam do zero**.

## Estado local

Frontend3016 (`/admin/afiliados`), API real3351, ponte privada4452, PostgreSQL5638, Redis5640 e worker normal ativos em loopback. O simulador4451 foi encerrado. A conta admin foi preservada; somente os cadastros demonstrativos identificados foram removidos, após conferir ausência de outros cadastros do usuário. Último snapshot: zero segmentações, grupos, instâncias, ofertas e entregas. Nenhuma mensagem foi enviada.

WhatsApp usa a chave administrativa da integração Evolution existente, guardada no `.env` local ignorado. A chave foi comparada com a configuração do próprio servidor. Uma consulta somente leitura para uma instância de teste inexistente retornou404, sem401/403. Servidor real: Evolution2.3.7. O operador deve criar uma nova instância e ler o QR no painel; não foi declarada conexão de telefone concluída.

## Catálogo central

`backend/scripts/local-vhg-bridge.mjs` acessa o contêiner VHG por SSH autorizado. O SQLite é aberto **somente leitura**; access token, refresh token, client secret e cookies ML não são importados no banco local nem enviados ao navegador. A renovação permanece com o VHG. Não há segundo processo local rotacionando seu refresh token.

A ponte aceita somente status, os caminhos GET permitidos de catálogo/vendedores e geração explícita de link. Não há ação para enviar mensagens, criar grupos, mudar OAuth ou controlar instâncias. Exige chave local, host SSH conhecido e limites de corpo/tempo/concorrência. Não modifica arquivos/configuração remotos; auxiliares executam em memória em processos transitórios. Identificação de afiliado fica na configuração privada.

Status real `CENTRAL/CONNECTED`. A busca **whey protein** retornou HTTP200 e um produto com preço65800 centavos. Três outros catálogos receberam aviso de comparação incompleta; não foram usados como preços completos. Isso não garante estoque ou menor preço global.

**Links existentes foram comprovados:** a ponte reutiliza o cache do VHG somente para o mesmo anúncio/vendedor e a mesma tag/perfil, passando novamente pela validação da atribuição. Entradas inválidas são ignoradas. Um produto registrado na origem retornou HTTP200 e link com atribuição válida pelo BFF real. Isso reaproveita o registro anterior, sem nova confirmação da página social. Não foi importado catálogo nem salva oferta local.

**Links novos ainda têm bloqueio externo:** a criação de um novo link foi aceita pelo ML, mas sua página social retornou403 na confirmação do produto/vendedor, inclusive no navegador isolado local. Retirar `forceInApp` também não liberou a leitura. Não houve resolução de CAPTCHA nem contorno do bloqueio. Esse link novo não foi liberado como verificado ou salvo em oferta. O erro agora explica essa falha; pode-se usar um link conferido manualmente. Não declarar a geração automática de links novos live concluída.

A UI CENTRAL explica a origem e a gestão separada dos grupos; oculta configuração/conexão/desconexão OAuth locais, mantendo busca, geração revisada e oferta manual.

## CSRF corrigido

Reprodução: cookies antigos de autenticação sem `csrf` causavam403 antes de validar a senha correta. GET `/api/v1/auth/csrf`, sem cache, recupera somente esse token. O cliente inicializa antes da mutação quando necessário, compartilha solicitações concorrentes, falha fechado e não repete mutações negadas403. Suporte tem somente uma exceção estreita para esse GET; o bloqueio de escrita permanece.

Prova no navegador via BFF normal, sem mocks: sessão antiga semcsrf passou por bootstrap200, login200 e sessão200; o painel carregou zerado. A nota CENTRAL e ausência de controles OAuth locais também foram conferidas; sem overflow desktop.

## Verificação

- Backend: 53 testes afetados passaram; lint, typecheck e build passaram. O teste posterior do cache de afiliados passou com os cinco testes do helper local; a recuperação real de um link da origem foi comprovada no navegador.
- Frontend: **843 testes /217 arquivos**, lint, typecheck e build passaram. Novos cenários CENTRAL tiveram RED/GREEN e oito testes de catálogo/tela passaram.
- Playwright Test: quatro E2E desktop/mobile com fixtures de UI passaram. Consultas reais e bloqueio403 foram comprovados separadamente no MCP/HTTP.
- Testes inicialmente leram a nova configuração privada por dotenv; `vitest.config.ts` agora usa NUL ou `/dev/null`, sem sobrescrever variáveis explícitas PostgreSQL. Repetição passou. A suíte completa backend/Pix/PostgreSQL não foi repetida contra o banco local vivo.
- `git diff --check` passou. Sem novas dependências, lockfiles, commit, push ou deploy.

## Retomar e desligar

Arquivos privados ignorados: `backend/.env`, `output/local-affiliates/bridge-config.json` e bundle puro `output/local-affiliates/vhg-reference.cjs`. Não versionar ou imprimir seus valores.

No backend, em sessões separadas: `node scripts/local-vhg-bridge.mjs`, `npx tsx src/server.ts` e `npx tsx src/worker.ts`. No frontend, configurar `API_ORIGIN=http://127.0.0.1:3351`, `TENANT_HOST=localhost`, `TEMLINK_DEMO_BUILD=1` e executar `npm run dev -- --hostname 127.0.0.1 --port 3016`.

A ponte depende do SSH, do nome do contêiner de origem e da conta mantida pelo VHG. Novo deploy da origem pode exigir atualizar a referência privada. Conta expirada/revogada exige recuperação na origem; não é uma autorização independente nem implantação de produção.

Para retirar a conexão, encerrar somente esses processos locais e remover a configuração de gateway/serviço. Não apagar o PostgreSQL ou os novos grupos do operador. A correção CSRF é independente.
