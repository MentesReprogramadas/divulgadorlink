# Railway

O arquivo `railway.ts` descreve o projeto. O Railway não lê esse arquivo no deploy. Quem aplica é o CLI, ou o workflow `.github/workflows/railway-config.yml`: push direto na `main` planeja e aplica na hora, e apaga serviço que existe no painel e não está no arquivo; pull request planeja no diff e aplica o plano pinado no merge.

## Primeira vez

1. Instale o Railway CLI 5.42.1 ou mais novo e autentique: `railway login`.
2. Na raiz do repositório: `npm ci`, depois `railway link`.
3. `railway config plan`. Se o plano criar o que está em `railway.ts`, rode `railway config apply`.
4. O job `bootstrap` preenche, se ainda estiverem vazios: `POSTGRES_PASSWORD` hexadecimal no `postgres`, o mesmo `JWT_SECRET` na `api` e no `worker`, um domínio `*.up.railway.app` em `web` e em `api`, e `APP_PUBLIC_URL` com o `https://` do `web`. Trocar a senha do Postgres depois que o volume inicializou quebra o banco. Stripe, Woovi, OpenAI e Resend continuam vazios até você gravar no painel.
5. Crie um project token do ambiente e grave como secret `RAILWAY_TOKEN` no GitHub. Sem ele, o workflow de config falha.

O deploy da aplicação em si não passa por esse workflow. Cada push em `main` dispara o Railway, e `checkSuites` segura o deploy até o workflow `ci` ficar verde.

## O que não está no arquivo

- Domínio gerado `*.up.railway.app`. O IaC não declara domínio automático.
- Tenant por subdomínio. Um host só da Railway não separa clientes. Isso exige domínio próprio e DNS wildcard.
- Segredo dentro do git. `preserve()` mantém o valor que já está no Railway e não escreve o segredo no repositório.
