# Railway

O arquivo `railway.ts` descreve o projeto. O Railway não lê esse arquivo no deploy. Quem aplica é o CLI, ou o workflow `.github/workflows/railway-config.yml`: push direto na `main` planeja e aplica na hora; pull request planeja no diff e aplica o plano pinado no merge.

## Primeira vez

1. Instale o Railway CLI 5.42.1 ou mais novo e autentique: `railway login`.
2. Na raiz do repositório: `npm ci`, depois `railway link`.
3. `railway config plan`. Se o plano criar o que está em `railway.ts`, rode `railway config apply`.
4. No serviço `postgres`, defina `POSTGRES_PASSWORD` com um valor só em hexadecimal (`openssl rand -hex 24`). Caracteres reservados de URL quebram o `DATABASE_URL`.
5. Nos serviços `api` e `worker`, defina o mesmo `JWT_SECRET` com pelo menos 16 caracteres (`openssl rand -base64 48`).
6. Gere um domínio público em `web` e em `api`. Webhook de Stripe e Woovi aponta para a API. O site é o `web`.
7. Defina `APP_PUBLIC_URL` na API e no worker com a URL pública do `web`, incluindo `https://`.
8. Crie um project token do ambiente e grave como secret `RAILWAY_TOKEN` no GitHub. Sem ele, o workflow de config falha.

O deploy da aplicação em si não passa por esse workflow. Cada push em `main` dispara o Railway, e `checkSuites` segura o deploy até o workflow `ci` ficar verde.

## O que não está no arquivo

- Domínio gerado `*.up.railway.app`. O IaC não declara domínio automático.
- Tenant por subdomínio. Um host só da Railway não separa clientes. Isso exige domínio próprio e DNS wildcard.
- Segredo dentro do git. `preserve()` mantém o valor que já está no Railway e não escreve o segredo no repositório.
