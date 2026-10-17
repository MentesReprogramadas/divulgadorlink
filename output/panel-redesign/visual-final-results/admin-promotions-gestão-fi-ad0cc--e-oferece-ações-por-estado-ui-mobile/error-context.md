# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-promotions.spec.ts >> gestão filtra todos os status, conta além de 40 cards e oferece ações por estado
- Location: e2e\admin-promotions.spec.ts:90:5

# Error details

```
Error: Command failed: docker exec -i divulgador-e2e-pg-panel-accepted-ui psql -U divulgador -d divulgador -t -A -c BEGIN; DELETE FROM moderation_cases WHERE "linkId" IN (SELECT id FROM links WHERE id='admin-promotion-ui-mobile' OR id LIKE 'status-ui-mobile-%'); DELETE FROM promotions WHERE "linkId" IN (SELECT id FROM links WHERE id='admin-promotion-ui-mobile' OR id LIKE 'status-ui-mobile-%'); DELETE FROM link_availability WHERE "linkId" IN (SELECT id FROM links WHERE id='admin-promotion-ui-mobile' OR id LIKE 'status-ui-mobile-%'); DELETE FROM analytics_events WHERE "linkId" IN (SELECT id FROM links WHERE id='admin-promotion-ui-mobile' OR id LIKE 'status-ui-mobile-%'); DELETE FROM audit_logs WHERE "entityId" IN (SELECT id FROM links WHERE id='admin-promotion-ui-mobile' OR id LIKE 'status-ui-mobile-%'); DELETE FROM links WHERE id='admin-promotion-ui-mobile' OR id LIKE 'status-ui-mobile-%'; COMMIT
ERROR:  deadlock detected
DETAIL:  Process 585 waits for ShareLock on transaction 1358; blocked by process 578.
Process 578 waits for ShareLock on transaction 1359; blocked by process 585.
HINT:  See server log for query details.
CONTEXT:  while deleting tuple (3,14) in relation "links"

```

# Page snapshot

```yaml
- generic [active] [ref=f2e1]:
  - link "Ir para o conteúdo" [ref=f2e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f2e3]:
    - generic [ref=f2e4]:
      - link "Home" [ref=f2e5] [cursor=pointer]:
        - /url: /
      - button "Menu" [ref=f2e7] [cursor=pointer]
  - main [ref=f2e11]:
    - generic [ref=f2e12]:
      - generic [ref=f2e13]:
        - heading "Moderação" [level=1] [ref=f2e15]
        - button "Sair" [ref=f2e17] [cursor=pointer]
      - generic [ref=f2e20]:
        - group "Ações da página" [ref=f2e21]:
          - link "Ver toda a fila" [ref=f2e22] [cursor=pointer]:
            - /url: /admin/moderacao
          - button "Limpar filtros" [ref=f2e25] [cursor=pointer]
        - search "Filtrar fila de moderação" [ref=f2e28]:
          - generic [ref=f2e29]:
            - generic [ref=f2e30]: Buscar na fila
            - searchbox "Buscar na fila" [ref=f2e32]
          - generic [ref=f2e33]:
            - generic [ref=f2e34]: Origem da revisão
            - generic [ref=f2e36]:
              - combobox "Origem da revisão" [ref=f2e37] [cursor=pointer]:
                - generic [ref=f2e38]: Todas as origens
              - textbox [aria-hidden] [ref=f2e42]: ALL
        - article [ref=f2e44]:
          - paragraph [ref=f2e45]: Envio · Aguardando
          - heading "Lote estados ui-mobile PENDING_MODERATION" [level=2] [ref=f2e46]
          - generic [ref=f2e47]:
            - paragraph [ref=f2e48]: Teste de status
            - paragraph [ref=f2e49]:
              - link "https://example.com/status-ui-mobile/PENDING_MODERATION" [ref=f2e50] [cursor=pointer]:
                - /url: https://example.com/status-ui-mobile/PENDING_MODERATION
          - paragraph [ref=f2e51]:
            - strong [ref=f2e52]: "Rede e categoria:"
            - text: Telegram · Jogos
          - paragraph [ref=f2e53]:
            - strong [ref=f2e54]: "Responsável:"
            - text: Bia · bia@tenant-a.test
          - generic [ref=f2e55]:
            - button "Aprovar" [ref=f2e56] [cursor=pointer]
            - button "Rejeitar" [ref=f2e59] [cursor=pointer]
  - contentinfo [ref=f2e62]:
    - generic [ref=f2e63]: Tem Link Aqui
    - navigation "Informações do site" [ref=f2e64]:
      - link "Termos" [ref=f2e65] [cursor=pointer]:
        - /url: /termos
      - link "Privacidade" [ref=f2e66] [cursor=pointer]:
        - /url: /privacidade
      - button "Gerenciar cookies" [ref=f2e67] [cursor=pointer]
  - alert [ref=f2e68]
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
     |                      ^ Error: Command failed: docker exec -i divulgador-e2e-pg-panel-accepted-ui psql -U divulgador -d divulgador -t -A -c BEGIN; DELETE FROM moderation_cases WHERE "linkId" IN (SELECT id FROM links WHERE id='admin-promotion-ui-mobile' OR id LIKE 'status-ui-mobile-%'); DELETE FROM promotions WHERE "linkId" IN (SELECT id FROM links WHERE id='admin-promotion-ui-mobile' OR id LIKE 'status-ui-mobile-%'); DELETE FROM link_availability WHERE "linkId" IN (SELECT id FROM links WHERE id='admin-promotion-ui-mobile' OR id LIKE 'status-ui-mobile-%'); DELETE FROM analytics_events WHERE "linkId" IN (SELECT id FROM links WHERE id='admin-promotion-ui-mobile' OR id LIKE 'status-ui-mobile-%'); DELETE FROM audit_logs WHERE "entityId" IN (SELECT id FROM links WHERE id='admin-promotion-ui-mobile' OR id LIKE 'status-ui-mobile-%'); DELETE FROM links WHERE id='admin-promotion-ui-mobile' OR id LIKE 'status-ui-mobile-%'; COMMIT
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