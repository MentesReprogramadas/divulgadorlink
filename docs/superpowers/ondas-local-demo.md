# Demonstração local Ondas

**Demo atualizada em 23/10/2026:** o bloqueio de reinício foi resolvido. A demo atual está em http://ondas.localhost:3013/, com a lente e o CSS compartilhados da preview aprovada, ícones monocromáticos e sem o botão Pausar ondas. O frontend persistente usa `.next-ondas-demo` (`TEMLINK_DEMO_BUILD=1`), separado do dev habitual e do diretório que os testes apagam. API/worker locais foram reiniciados separadamente, preservando PostgreSQL, Redis e os stubs do ambiente descartável. A auditoria por arquivo e a evidência atual estão em `ondas-component-audit-coverage.csv` e `2026-10-23-ondas-final-audit.md`; relatos de bloqueio abaixo são históricos.

Preparação de dados fictícios para revisar o frontend real. O script não foi executado durante sua preparação. O responsável pelo ambiente executa-o somente depois de iniciar o banco E2E descartável destinado à revisão.

## Destino restrito

- Arquivo: `output/ondas-demo/seed-demo.ts`.
- Ambiente: `E2E_RUN_ID=ondas-review-20261023`, `E2E_PORT_OFFSET=13`.
- PostgreSQL: `127.0.0.1:5446/divulgador`, schema `public`.
- Tenant próprio: `ondas-demo-20261023-tenant`, host `ondas.localhost`.
- Apenas `ONDAS_DEMO_DATABASE_URL` fornece a conexão. O script não importa `dotenv`, `env` nem Prisma global, e não usa `DATABASE_URL` como fallback. O pacote Prisma é carregado somente após validar o destino; seu carregador interno de ambiente pode ler `.env`, mas a URL fornecida explicitamente ao datasource prevalece. O modo `--check` nem sequer carrega esse pacote.
- O script recusa outro host, porta, banco, schema, opções de conexão e `NODE_ENV=production`. Não executa migrações, truncamento nem exclusão.

O banco precisa conter o seed E2E de `tenant-a.localhost`. Somente suas configurações e definições de facetas são lidas como referência. As facetas oficiais faltantes vêm de `backend/src/domain/catalog/initial-facets.ts`, sem copiar usuários, links ou dados de outros tenants. Todas as novas linhas têm o prefixo `ondas-demo-20261023` e pertencem ao tenant próprio. Um ID ou host que pertença a outra conta faz a operação falhar. Reexecuções conservam os registros já existentes e não redefinem suas senhas/conteúdo; anexos de fixture ausentes podem ser recriados.

## Execução pelo responsável

Na raiz do repositório, após iniciar o ambiente descartável correto:

```powershell
$env:ONDAS_DEMO_DATABASE_URL = 'postgresql://divulgador:divulgador@127.0.0.1:5446/divulgador?schema=public'
node backend/node_modules/tsx/dist/cli.mjs output/ondas-demo/seed-demo.ts --check
node backend/node_modules/tsx/dist/cli.mjs output/ondas-demo/seed-demo.ts
```

`--check` valida os limites e as definições, sem conectar ao banco nem baixar imagens. A execução normal usa Prisma com datasource explícito. O resultado informa IDs, quantidade de anexos efetivamente gravados e eventuais falhas de imagem. O host de acesso é `http://ondas.localhost:<porta-web>`; a porta final é a do servidor real configurado pelo responsável. O script não inicia servidores nem ocupa portas.

## Contas fictícias

| Conta | E-mail | Perfil |
| --- | --- | --- |
| Ana Comunidades | `ana@ondas.test` | Publicadora, três links |
| Bruno Descobertas | `bruno@ondas.test` | Publicador, três links |
| Admin | `admin@ondas.test` | Administrador apenas deste tenant |

Senha inicial de todas: `Ondas-demo-2026!`. São credenciais exclusivas desta demonstração descartável. Cada publicador fica dentro da quota atual de quatro links. Os e-mails são marcados como confirmados pela fixture, sem enviar mensagens.

## Conteúdo de revisão

| Comunidade | Tema existente | Rede apresentada | Anexos previstos | Destaque |
| --- | --- | --- | --- | --- |
| Fora do roteiro | Esportes | WhatsApp | Capa de montanhas | HOME administrativo |
| Frequência indie | Músicas | Telegram | Capa e ícone de música | HOME administrativo |
| Código aberto | Tecnologia & Internet | Discord | Capa e ícone de tecnologia | Não |
| Estúdio aberto | Serviços Profissionais | Instagram | Capa e ícone de fotografia | Não |
| Entre páginas e boas histórias | Educação & Cursos | WhatsApp | Sem capa e sem ícone | Não |
| Mesa compartilhada | Entretenimento Geral | YouTube | Sem capa e sem ícone | Não |

Títulos e descrições longas permitem conferir truncamento no catálogo e o texto completo em “Sobre a comunidade”. Os dois cards sem capa não recebem anexos vazios nem placeholders. As categorias usam a taxonomia existente, sem criar uma regra nova de produto.

As redes são dados de apresentação de fixture. Os seis destinos agora usam o domínio reservado `example.com/ondas-demo-20261023/...`, atendido pelo probe E2E já existente. O antigo `example.invalid` causou falhas reais do verificador de disponibilidade e retirou os seis links do catálogo; uma transação restrita às linhas `demo.seed` desta demonstração restaurou a fixture e seus dois destaques administrativos, sem alterar o monitor. Evidência: `output/ondas-demo/refresh-demo.sql` e `refresh-demo.log`. Não há destino de comunidade ou pessoa real; saída externa continua sem validação comercial.

## Imagens e limites

As quatro fotos vêm exclusivamente das URLs de Unsplash já usadas por `frontend/src/features/home-preview/preview-data.ts` (`mountains`, `music`, `technology`, `photography`). Não há captura de tela, foto de usuário nem nova origem. Crédito da fonte visual: [Unsplash](https://unsplash.com/license).

Cada download permite até 5 MB, 15 segundos e 32 milhões de pixels, recusa redirecionamento e imagem animada e passa por decodificação raster. O Sharp produz WebP sem metadados, com capa até 1400 × 1000 e 1 MB, e ícone 256 × 256 e 256 KB. Os bytes ficam em `LinkMediaAsset`; a UI e os endpoints de mídia são os reais. Se uma origem falhar, o script registra a falha e conserva o link sem a imagem, sem buscar outro serviço.

## Limites da evidência

`PUBLISHED` e `APPROVED` são estados sintéticos documentados da fixture. Não provam aprovação humana, política automática nem o fluxo E2E de moderação. Os dois patrocinados são `Promotion` com `administrative=true`, superfície `HOME`, sem pedido, investimento, preço duplicado, gateway ou chamada de pagamento. Não são anúncios comprados.

Não são criados eventos, contadores artificiais, embeddings ou chamadas de IA. Impressões começam em zero e podem mudar com a navegação normal. O script registra `demo.seed` com o aviso de fixture. Para apagar esta demonstração, o responsável pode remover o ambiente descartável inteiro ao fim da revisão, usando o ciclo de vida E2E existente; o script não remove tenants.

## Verificação da preparação

Preparação validada em 23/10/2026:

- TypeScript estrito do script e suas importações: passou, sem emitir arquivos.
- `--check` com o destino permitido: passou sem conectar ao banco nem baixar imagens.
- Nove cenários em processos locais: destino permitido aceito; URL ausente, host, porta, banco, schema, schema duplicado, opção de conexão alternativa e modo de produção recusados.

Não houve execução normal do seed, conexão PostgreSQL, download, build, E2E ou inspeção no navegador por esta preparação. A quantidade real de fotos só será conhecida quando o responsável executar o preenchimento. `--check` não substitui essa execução futura nem a inspeção real da home.

## Execução posterior pelo agente principal

O seed foi executado no banco descartável correto, com seis links, quatro capas e três ícones gravados. Resultado: `output/ondas-demo/seed-result.log`. Home de revisão: `http://ondas.localhost:3013`. Dois destaques são administrativos de fixture, sem pedido ou pagamento. O banco habitual do projeto não foi alterado.

Os 12 testes integrados de anexos e recursos passaram em desktop/mobile em 55,7 s; logs e 46 capturas estão preservados em `output/ondas-demo/`. O revisor abriu todas as capturas e também conferiu as quatro fotografias reais após rolagem para carregar imagens lazy. Credenciais acima são exclusivas desta demonstração.

O bloqueio de reinício registrado nesta execução histórica foi resolvido na rodada atual. A porta3013 agora serve o código novo no diretório exclusivo da demo. Consulte o relatório atual para os testes executados, rechecagens e limites; as capturas e contagens históricas acima não validam automaticamente mudanças posteriores.
