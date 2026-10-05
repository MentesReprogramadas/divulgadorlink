# Railway com GitHub

## Decisão

Cinco recursos no mesmo projeto Railway, descritos em `.railway/railway.ts` e aplicados pelo CLI ou pelo workflow `railway-config`. O deploy do código usa a integração nativa do GitHub, com `checkSuites`, então o Railway só promove o commit depois que o workflow `ci` passa. Não há um segundo caminho que chame `railway up`.

`railway.toml` fica de fora. Config as Code deixa de ser lida em 2026-12-01, e serviço novo não pode optar por ela.

## Recursos

| Recurso | Origem | Função |
| --- | --- | --- |
| `postgres` | imagem `pgvector/pgvector:pg16` | Postgres 16 com pgvector, volume em `/var/lib/postgresql/data` |
| `redis` | helper `redis()` do Railway | Fila BullMQ |
| `api` | `backend/Dockerfile` | Fastify. Só este serviço roda `prisma migrate deploy` |
| `worker` | a mesma imagem | `node build/worker.js`. Sem migração e sem healthcheck HTTP |
| `web` | `frontend/Dockerfile` | Next standalone. Health em `/health`, sem chamar a API |

O helper `postgres()` do Railway usa Postgres 18 sem pgvector. A migration `CREATE EXTENSION vector` falharia. A imagem fica alinhada ao `docker-compose` e ao CI. A tag `pg16` ainda flutua no Docker Hub. Travamento por digest fica para depois.

Redis de produção é a imagem mantida pelo Railway (8.x). O desenvolvimento continua em Redis 7. O protocolo do BullMQ aguenta os dois. O custo é essa diferença de versão.

## Problemas que o boot quebraria

- Build `tsup src` publicava cada spec na imagem. O build de produção agora entra só por `src/server.ts` e `src/worker.ts`.
- A rede privada do Railway é IPv6. Cliente Redis e o BFF usam `family: 0`.
- O Next standalone escuta `HOSTNAME`. A Railway preenche isso com o id do container. O start força `HOSTNAME=0.0.0.0`.
- Variável opcional vazia falha o Zod (`WOOVI_API_BASE_URL`, `APP_PUBLIC_URL`). String vazia passa a significar ausente. `JWT_SECRET` vazio continua inválido.
- `PIX_EXPIRATION_SECONDS` não entra na config de produção. A API recusa subir se a variável existir.

## O que o repositório não faz

Conectar a conta GitHub, gerar domínio e gravar senha. Isso é `railway login`, `railway link`, `railway config apply` e o painel. Os passos estão em `.railway/README.md`.

`POSTGRES_PASSWORD` precisa ser hexadecimal. O `DATABASE_URL` da API interpola essa senha. Um caractere reservado quebra a URL.

Tenant continua saindo do `Host`. O domínio `*.up.railway.app` é um tenant só. Subdomínio por cliente exige DNS próprio. Isso não foi automatizado.

## Custo

Volume de 5 GB no Postgres, mais API, worker, web e Redis sempre ligados. Cada push em `backend/` redeploya API e worker, inclusive a migração. Push só em `frontend/` não reconstrói a API. O job `images` do CI constrói as duas imagens em todo push. Isso gasta minuto de Actions para não descobrir Dockerfile quebrado só no Railway.
