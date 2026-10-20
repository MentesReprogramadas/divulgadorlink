# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profile-hosts.spec.ts >> F10-E01/T01/T02/T04/T05/T06 endereço público isolado, prévia existente, publicação e perda de cobertura
- Location: e2e\profile-hosts.spec.ts:17:5

# Error details

```
Error: Command failed: docker exec -i divulgador-e2e-pg-roadmap-f10 psql -U divulgador -d divulgador -t -A -c INSERT INTO profile_plans(id,"tenantId",tier,title,"updatedAt") VALUES('f10-plan','cmvgl7cci00bzu4r01y10gaa5','PREMIUM','Fixture Premium',NOW()) ON CONFLICT(id) DO NOTHING; INSERT INTO profile_plan_versions(id,"tenantId","planId",version,"amountCents",capabilities) VALUES('f10-plan-v1','cmvgl7cci00bzu4r01y10gaa5','f10-plan',1,1000,ARRAY['profile.page','profile.categories','profile.appearance','profile.history','profile.subdomain']) ON CONFLICT(id) DO NOTHING; INSERT INTO profile_billing_accounts(id,"tenantId","ownerId","updatedAt") VALUES('f10-account','cmvgl7cci00bzu4r01y10gaa5','cmvgl7cct00chu4r0zjahobfn',NOW()) ON CONFLICT(id) DO NOTHING; INSERT INTO profile_subscriptions(id,"tenantId","ownerId","accountId","planVersionId",status,"periodStart","periodEnd","paidThrough","updatedAt") VALUES('f10-sub','cmvgl7cci00bzu4r01y10gaa5','cmvgl7cct00chu4r0zjahobfn','f10-account','f10-plan-v1','ACTIVE',NOW()-INTERVAL '1 day',NOW()+INTERVAL '30 days',NOW()+INTERVAL '30 days',NOW()) ON CONFLICT(id) DO UPDATE SET status='ACTIVE',"paidThrough"=NOW()+INTERVAL '30 days',"periodEnd"=NOW()+INTERVAL '30 days'; INSERT INTO profile_entitlements(id,"tenantId","ownerId","subscriptionId",capability,"validFrom","validUntil") VALUES('f10-entitlement','cmvgl7cci00bzu4r01y10gaa5','cmvgl7cct00chu4r0zjahobfn','f10-sub','profile.subdomain',NOW()-INTERVAL '1 day',NOW()+INTERVAL '30 days') ON CONFLICT(id) DO UPDATE SET "revokedAt"=NULL,"validUntil"=NOW()+INTERVAL '30 days'
ERROR:  new row for relation "profile_plan_versions" violates check constraint "profile_plan_versions_money_check"
DETAIL:  Failing row contains (f10-plan-v1, cmvgl7cci00bzu4r01y10gaa5, f10-plan, 1, 1000, BRL, month, {profile.page,profile.categories,profile.appearance,profile.hist..., null, null, f, 2026-10-20 11:17:54.787).

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
      - button "Menu" [ref=f1e7] [cursor=pointer]
  - main [ref=f1e11]:
    - generic [ref=f1e12]:
      - heading "Painel" [level=1] [ref=f1e15]
      - group "Ações da página" [ref=f1e16]:
        - link "Novo link" [ref=f1e17] [cursor=pointer]:
          - /url: /painel/links/novo
        - link "Gerenciar links" [ref=f1e20] [cursor=pointer]:
          - /url: /painel/links
      - generic [ref=f1e24]:
        - generic "Métricas" [ref=f1e25]:
          - generic [ref=f1e26]:
            - term [ref=f1e27]: Links publicados
            - definition [ref=f1e28]:
              - text: "0"
              - generic [ref=f1e29]: 0 links no total
          - generic [ref=f1e30]:
            - term [ref=f1e31]: Em revisão
            - definition [ref=f1e32]:
              - text: "0"
              - generic [ref=f1e33]: 0 rejeitados
          - generic [ref=f1e34]:
            - term [ref=f1e35]: Cliques nos links
            - definition [ref=f1e36]:
              - text: "0"
              - generic [ref=f1e37]: 0 impressões · 0%
          - generic [ref=f1e38]:
            - term [ref=f1e39]: Total pago
            - definition [ref=f1e40]:
              - text: R$ 0,00
              - generic [ref=f1e41]: 0 pagamentos pendentes
        - region "Precisa de atenção" [ref=f1e43]:
          - generic [ref=f1e44]:
            - heading "Precisa de atenção" [level=2] [ref=f1e46]
            - link "Ver todos" [ref=f1e47] [cursor=pointer]:
              - /url: /painel/links
          - paragraph [ref=f1e48]: Você está em dia. Nenhum link precisa de ajuste.
        - region "O que você quer fazer?" [ref=f1e49]:
          - heading "O que você quer fazer?" [level=2] [ref=f1e52]
          - generic [ref=f1e53]:
            - link "Montar minha página → Uma página com os seus links." [ref=f1e54] [cursor=pointer]:
              - /url: /painel/perfil
              - strong [ref=f1e55]: Montar minha página →
              - generic [ref=f1e56]: Uma página com os seus links.
            - link "Criar um convite fixo → Atualize o destino sem trocar o endereço." [ref=f1e57] [cursor=pointer]:
              - /url: /painel/convites
              - strong [ref=f1e58]: Criar um convite fixo →
              - generic [ref=f1e59]: Atualize o destino sem trocar o endereço.
            - link "Consultar pedidos → Veja pagamentos e destaques." [ref=f1e60] [cursor=pointer]:
              - /url: /painel/pedidos
              - strong [ref=f1e61]: Consultar pedidos →
              - generic [ref=f1e62]: Veja pagamentos e destaques.
  - contentinfo [ref=f1e63]:
    - generic [ref=f1e64]: Tem Link Aqui
    - navigation "Informações do site" [ref=f1e65]:
      - link "Termos" [ref=f1e66] [cursor=pointer]:
        - /url: /termos
      - link "Privacidade" [ref=f1e67] [cursor=pointer]:
        - /url: /privacidade
      - button "Gerenciar cookies" [ref=f1e68] [cursor=pointer]
  - alert [ref=f1e69]
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