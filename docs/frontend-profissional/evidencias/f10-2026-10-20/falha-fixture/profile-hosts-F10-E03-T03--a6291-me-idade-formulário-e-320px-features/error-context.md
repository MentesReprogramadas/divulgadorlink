# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profile-hosts.spec.ts >> F10-E03/T03/T04/T05 rede/HTTPS pendente recupera sem perder nome, idade, formulário e 320px
- Location: e2e\profile-hosts.spec.ts:19:5

# Error details

```
Error: Command failed: docker exec -i divulgador-e2e-pg-roadmap-f10 psql -U divulgador -d divulgador -t -A -c INSERT INTO profile_plans(id,"tenantId",tier,title,"updatedAt") VALUES('f10-plan','cmvgl7cci00bzu4r01y10gaa5','PREMIUM','Fixture Premium',NOW()) ON CONFLICT(id) DO NOTHING; INSERT INTO profile_plan_versions(id,"tenantId","planId",version,"amountCents",capabilities) VALUES('f10-plan-v1','cmvgl7cci00bzu4r01y10gaa5','f10-plan',1,1000,ARRAY['profile.page','profile.categories','profile.appearance','profile.history','profile.subdomain']) ON CONFLICT(id) DO NOTHING; INSERT INTO profile_billing_accounts(id,"tenantId","ownerId","updatedAt") VALUES('f10-account','cmvgl7cci00bzu4r01y10gaa5','cmvgl7cct00chu4r0zjahobfn',NOW()) ON CONFLICT(id) DO NOTHING; INSERT INTO profile_subscriptions(id,"tenantId","ownerId","accountId","planVersionId",status,"periodStart","periodEnd","paidThrough","updatedAt") VALUES('f10-sub','cmvgl7cci00bzu4r01y10gaa5','cmvgl7cct00chu4r0zjahobfn','f10-account','f10-plan-v1','ACTIVE',NOW()-INTERVAL '1 day',NOW()+INTERVAL '30 days',NOW()+INTERVAL '30 days',NOW()) ON CONFLICT(id) DO UPDATE SET status='ACTIVE',"paidThrough"=NOW()+INTERVAL '30 days',"periodEnd"=NOW()+INTERVAL '30 days'; INSERT INTO profile_entitlements(id,"tenantId","ownerId","subscriptionId",capability,"validFrom","validUntil") VALUES('f10-entitlement','cmvgl7cci00bzu4r01y10gaa5','cmvgl7cct00chu4r0zjahobfn','f10-sub','profile.subdomain',NOW()-INTERVAL '1 day',NOW()+INTERVAL '30 days') ON CONFLICT(id) DO UPDATE SET "revokedAt"=NULL,"validUntil"=NOW()+INTERVAL '30 days'
ERROR:  new row for relation "profile_plan_versions" violates check constraint "profile_plan_versions_money_check"
DETAIL:  Failing row contains (f10-plan-v1, cmvgl7cci00bzu4r01y10gaa5, f10-plan, 1, 1000, BRL, month, {profile.page,profile.categories,profile.appearance,profile.hist..., null, null, f, 2026-10-20 11:17:08.13).

```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - link "Ir para o conteúdo" [ref=f1e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f1e3]:
    - generic [ref=f1e4]:
      - link "Home" [ref=f1e5] [cursor=pointer]:
        - /url: /
      - navigation "Navegação principal" [ref=f1e7]:
        - link "Busca" [ref=f1e8] [cursor=pointer]:
          - /url: /busca
        - link "Painel" [ref=f1e12] [cursor=pointer]:
          - /url: /painel
        - button "Sair" [ref=f1e17] [cursor=pointer]
  - main [ref=f1e21]:
    - complementary [ref=f1e22]:
      - paragraph [ref=f1e23]:
        - text: Meu espaço
        - generic [ref=f1e24]: Tem Link Aqui
      - navigation "Áreas do painel" [ref=f1e26]:
        - generic [ref=f1e27]:
          - paragraph [ref=f1e28]: Seu espaço
          - link "Visão geral" [ref=f1e29] [cursor=pointer]:
            - /url: /painel
          - link "Convites" [ref=f1e32] [cursor=pointer]:
            - /url: /painel/convites
          - link "Equipe" [ref=f1e35] [cursor=pointer]:
            - /url: /painel/equipe
        - generic [ref=f1e38]:
          - paragraph [ref=f1e39]: Catálogo
          - link "Meus links" [ref=f1e40] [cursor=pointer]:
            - /url: /painel/links
          - link "Criar link" [ref=f1e43] [cursor=pointer]:
            - /url: /painel/links/novo
        - group [ref=f1e47]:
          - generic "Minha página" [ref=f1e48] [cursor=pointer]
        - generic [ref=f1e54]:
          - paragraph [ref=f1e55]: Acompanhar
          - link "Pedidos" [ref=f1e56] [cursor=pointer]:
            - /url: /painel/pedidos
          - link "Lembretes" [ref=f1e59] [cursor=pointer]:
            - /url: /painel/lembretes
          - link "Favoritos" [ref=f1e62] [cursor=pointer]:
            - /url: /painel/favoritos
          - link "Categorias seguidas" [ref=f1e65] [cursor=pointer]:
            - /url: /painel/interesses
        - generic [ref=f1e68]:
          - paragraph [ref=f1e69]: Preferências
          - link "Assinatura" [ref=f1e70] [cursor=pointer]:
            - /url: /painel/assinatura
          - link "Conta" [ref=f1e73] [cursor=pointer]:
            - /url: /painel/conta
    - generic [ref=f1e76]:
      - heading "Painel" [level=1] [ref=f1e79]
      - group "Ações da página" [ref=f1e80]:
        - link "Novo link" [ref=f1e81] [cursor=pointer]:
          - /url: /painel/links/novo
        - link "Gerenciar links" [ref=f1e84] [cursor=pointer]:
          - /url: /painel/links
      - generic [ref=f1e88]:
        - generic "Métricas" [ref=f1e89]:
          - generic [ref=f1e90]:
            - term [ref=f1e91]: Links publicados
            - definition [ref=f1e92]:
              - text: "0"
              - generic [ref=f1e93]: 0 links no total
          - generic [ref=f1e94]:
            - term [ref=f1e95]: Em revisão
            - definition [ref=f1e96]:
              - text: "0"
              - generic [ref=f1e97]: 0 rejeitados
          - generic [ref=f1e98]:
            - term [ref=f1e99]: Cliques nos links
            - definition [ref=f1e100]:
              - text: "0"
              - generic [ref=f1e101]: 0 impressões · 0%
          - generic [ref=f1e102]:
            - term [ref=f1e103]: Total pago
            - definition [ref=f1e104]:
              - text: R$ 0,00
              - generic [ref=f1e105]: 0 pagamentos pendentes
        - region "Precisa de atenção" [ref=f1e107]:
          - generic [ref=f1e108]:
            - heading "Precisa de atenção" [level=2] [ref=f1e110]
            - link "Ver todos" [ref=f1e111] [cursor=pointer]:
              - /url: /painel/links
          - paragraph [ref=f1e112]: Você está em dia. Nenhum link precisa de ajuste.
        - region "O que você quer fazer?" [ref=f1e113]:
          - heading "O que você quer fazer?" [level=2] [ref=f1e116]
          - generic [ref=f1e117]:
            - link "Montar minha página → Uma página com os seus links." [ref=f1e118] [cursor=pointer]:
              - /url: /painel/perfil
              - strong [ref=f1e119]: Montar minha página →
              - generic [ref=f1e120]: Uma página com os seus links.
            - link "Criar um convite fixo → Atualize o destino sem trocar o endereço." [ref=f1e121] [cursor=pointer]:
              - /url: /painel/convites
              - strong [ref=f1e122]: Criar um convite fixo →
              - generic [ref=f1e123]: Atualize o destino sem trocar o endereço.
            - link "Consultar pedidos → Veja pagamentos e destaques." [ref=f1e124] [cursor=pointer]:
              - /url: /painel/pedidos
              - strong [ref=f1e125]: Consultar pedidos →
              - generic [ref=f1e126]: Veja pagamentos e destaques.
  - contentinfo [ref=f1e127]:
    - generic [ref=f1e128]: Tem Link Aqui
    - navigation "Informações do site" [ref=f1e129]:
      - link "Termos" [ref=f1e130] [cursor=pointer]:
        - /url: /termos
      - link "Privacidade" [ref=f1e131] [cursor=pointer]:
        - /url: /privacidade
      - button "Gerenciar cookies" [ref=f1e132] [cursor=pointer]
  - alert [ref=f1e133]
```

# Test source

```ts
  1  | import { runtime as e2eRuntime } from './runtime.cjs'
  2  | import { execFileSync } from 'node:child_process'
  3  | import { request as httpRequest } from 'node:http'
  4  | import path from 'node:path'
  5  | 
  6  | export function sql(statement: string): string {
> 7  |   return execFileSync('docker', [
     |                      ^ Error: Command failed: docker exec -i divulgador-e2e-pg-roadmap-f10 psql -U divulgador -d divulgador -t -A -c INSERT INTO profile_plans(id,"tenantId",tier,title,"updatedAt") VALUES('f10-plan','cmvgl7cci00bzu4r01y10gaa5','PREMIUM','Fixture Premium',NOW()) ON CONFLICT(id) DO NOTHING; INSERT INTO profile_plan_versions(id,"tenantId","planId",version,"amountCents",capabilities) VALUES('f10-plan-v1','cmvgl7cci00bzu4r01y10gaa5','f10-plan',1,1000,ARRAY['profile.page','profile.categories','profile.appearance','profile.history','profile.subdomain']) ON CONFLICT(id) DO NOTHING; INSERT INTO profile_billing_accounts(id,"tenantId","ownerId","updatedAt") VALUES('f10-account','cmvgl7cci00bzu4r01y10gaa5','cmvgl7cct00chu4r0zjahobfn',NOW()) ON CONFLICT(id) DO NOTHING; INSERT INTO profile_subscriptions(id,"tenantId","ownerId","accountId","planVersionId",status,"periodStart","periodEnd","paidThrough","updatedAt") VALUES('f10-sub','cmvgl7cci00bzu4r01y10gaa5','cmvgl7cct00chu4r0zjahobfn','f10-account','f10-plan-v1','ACTIVE',NOW()-INTERVAL '1 day',NOW()+INTERVAL '30 days',NOW()+INTERVAL '30 days',NOW()) ON CONFLICT(id) DO UPDATE SET status='ACTIVE',"paidThrough"=NOW()+INTERVAL '30 days',"periodEnd"=NOW()+INTERVAL '30 days'; INSERT INTO profile_entitlements(id,"tenantId","ownerId","subscriptionId",capability,"validFrom","validUntil") VALUES('f10-entitlement','cmvgl7cci00bzu4r01y10gaa5','cmvgl7cct00chu4r0zjahobfn','f10-sub','profile.subdomain',NOW()-INTERVAL '1 day',NOW()+INTERVAL '30 days') ON CONFLICT(id) DO UPDATE SET "revokedAt"=NULL,"validUntil"=NOW()+INTERVAL '30 days'
  8  |     'exec', '-i', e2eRuntime.pgContainer,
  9  |     'psql', '-U', 'divulgador', '-d', 'divulgador', '-t', '-A', '-c', statement,
  10 |   ], { encoding: 'utf8' }).trim()
  11 | }
  12 | 
  13 | export function redisScan(pattern: string): string {
  14 |   return execFileSync('docker', [
  15 |     'exec', e2eRuntime.redisContainer, 'redis-cli', '--scan', '--pattern', pattern,
  16 |   ], { encoding: 'utf8' }).trim()
  17 | }
  18 | 
  19 | export function promoteJob(jobId: string): string {
  20 |   return execFileSync('npx', ['tsx', 'scripts/promote-job.ts', jobId], {
  21 |     cwd: path.resolve(__dirname, '../../backend'),
  22 |     encoding: 'utf8',
  23 |     shell: true,
  24 |     env: { ...process.env, REDIS_URL: e2eRuntime.redisUrl },
  25 |   }).trim()
  26 | }
  27 | 
  28 | export function getRaw(path: string, host: string): Promise<{ status: number; text: string }> {
  29 |   return new Promise((resolve, reject) => {
  30 |     const req = httpRequest({ hostname: '127.0.0.1', port: e2eRuntime.apiPort, path, method: 'GET', headers: { host } }, (res) => {
  31 |       const chunks: Buffer[] = []
  32 |       res.on('data', (chunk: Buffer) => chunks.push(chunk))
  33 |       res.on('end', () => resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString() }))
  34 |     })
  35 |     req.on('error', reject)
  36 |     req.end()
  37 |   })
  38 | }
  39 | 
  40 | export function postRaw(input: {
  41 |   path: string
  42 |   host: string
  43 |   headers?: Record<string, string>
  44 |   body?: string
  45 | }): Promise<{ status: number; text: string }> {
  46 |   const body = input.body ?? ''
  47 |   return new Promise((resolve, reject) => {
  48 |     const req = httpRequest({
  49 |       hostname: '127.0.0.1',
  50 |       port: e2eRuntime.apiPort,
  51 |       path: input.path,
  52 |       method: 'POST',
  53 |       headers: {
  54 |         host: input.host,
  55 |         'content-type': 'application/json',
  56 |         'content-length': Buffer.byteLength(body),
  57 |         ...(input.headers ?? {}),
  58 |       },
  59 |     }, (res) => {
  60 |       const chunks: Buffer[] = []
  61 |       res.on('data', (chunk: Buffer) => chunks.push(chunk))
  62 |       res.on('end', () => resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString() }))
  63 |     })
  64 |     req.on('error', reject)
  65 |     req.end(body)
  66 |   })
  67 | }
  68 | 
```