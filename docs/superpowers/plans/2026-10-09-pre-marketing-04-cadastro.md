# Cadastro sem telefone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar conta pede nome, e-mail e senha, cai na verificação ou no formulário, e não deixa conta órfã se o e-mail do código falhar.

**Architecture:** `phone` no `registerBodySchema` passa a opcional. Sem telefone, não cria `UserIdentifier` de `PHONE`. O formulário remove o campo. O redirect deixa de ser cego para `/painel`: a resposta 201 já traz `canSubmitLink: false` no cadastro novo, então o cliente vai para `/painel/verificar`. Quem já confirmou (não é o caso do cadastro) usaria `/painel/links/novo`. Se `issueInitialCodes` lançar `DeliveryUnavailableError`, apagar o usuário recém-criado e responder 503 sem cookie de sessão. A tela de verificar ganha a frase sobre a caixa de spam.

**Tech Stack:** Fastify, Zod, Vitest, Playwright.

## Global Constraints

- `canSubmitLink` continua exigindo só e-mail confirmado e status `ACTIVE`.
- Telefone já gravado em contas antigas permanece. Ban por telefone permanece para essas contas.
- Não adicionar provedor de SMS.
- O botão “Criar conta” fica `disabled` enquanto o POST não voltou.
- Atualizar `frontend/e2e/mail.spec.ts` para não preencher telefone. Se algum teste depender de telefone único para não colidir, a unicidade passa a ser o e-mail.

---

### Task 1: Schema e rollback

**Files:**
- Modify: `backend/src/use-cases/@Auth/register.ts`
- Modify: `backend/src/http/controllers/@auth/routes.ts`
- Test: o spec HTTP de register existente. Procurar `register` em `backend/src/http`. Se não houver arquivo só de register, criar `backend/src/http/controllers/@auth/register.http.spec.ts`.

**Interfaces:**
- Consumes: `DeliveryUnavailableError`, `issueInitialCodes`
- Produces: `POST /api/v1/auth/register` com body sem `phone` responde 201; com falha de entrega responde 503 e `users` não contém o e-mail

- [ ] **Step 1: Write the failing test**

```ts
it('cria a conta sem telefone', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    headers: { host: 'tenant-a.localhost' },
    payload: { name: 'Ana', email: 'ana-sem-fone@example.com', password: 'senha1234' },
  })
  expect(response.statusCode).toBe(201)
  expect(response.json().user.canSubmitLink).toBe(false)
})
```

Segundo teste, com o delivery fake lançando `DeliveryUnavailableError`: status 503 e nenhum usuário com esse e-mail. O fake entra por injeção já existente em `confirmationProviders` ou por um setter de teste no estilo `setEditVerdictForTest`. Se não houver setter, criar `setConfirmationDeliveryForTest` que só funciona com `NODE_ENV=test`.

- [ ] **Step 2: Run and confirm FAIL**

O teste sem telefone falha com 400. O de rollback falha porque o usuário fica gravado.

- [ ] **Step 3: Implement**

`phone: z.string().min(8).optional()`. `execute` só cria o identifier de telefone quando `normalizedPhone` não é vazio. No controller, `try/catch` em volta de `issueInitialCodes`: no `DeliveryUnavailableError`, `prisma.user.delete` do id recém-criado (cascade nos identifiers) e `503` com `{ message: 'Não foi possível enviar o código. Tente de novo.' }` sem `setCookie`.

- [ ] **Step 4: Run the register spec**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/use-cases/@Auth/register.ts backend/src/http/controllers/@auth/routes.ts backend/src/http/controllers/@auth/register.http.spec.ts
git commit -m "fix: não guarda conta quando o código não sai"
```

### Task 2: Formulário, destino e spam

**Files:**
- Modify: `frontend/src/app/cadastro/page.tsx`
- Modify: `frontend/src/app/painel/verificar/page.tsx`
- Modify: `frontend/e2e/mail.spec.ts`
- Test: `frontend/e2e/signup.spec.ts`

- [ ] **Step 1: Write the failing Playwright test**

```ts
test('cadastro sem telefone cai na verificação e avisa o spam', async ({ page }) => {
  await page.goto(`${A}/cadastro`)
  await expect(page.getByLabel('Telefone')).toHaveCount(0)
  await page.getByLabel('Nome').fill('Nova')
  await page.getByLabel('E-mail').fill(`nova-${Date.now()}@tenant-a.test`)
  await page.getByLabel('Senha').fill(state.password)
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page).toHaveURL(/\/painel\/verificar/)
  await expect(page.getByText('Olhe também o spam.')).toBeVisible()
})
```

Incluir o spec no project `catalog`.

- [ ] **Step 2: Run and confirm FAIL**

- [ ] **Step 3: Implement the form**

Remover o `Field` de telefone e a chave `phone` do JSON. `disabled` no botão a partir do submit até a resposta. No 201, `location.assign('/painel/verificar')` porque conta nova não tem e-mail confirmado. No 503, mostrar `result.body.message`. No 409, mostrar “Esse e-mail já está cadastrado. Entre.” com link `/login`.

Em `verificar/page.tsx`, no parágrafo do código, acrescentar “Olhe também o spam.”

Atualizar `register()` em `mail.spec.ts`: tirar o argumento `phone` e o `fill` do telefone. Ajustar os call sites. `nextPhone` pode sair se ficar sem uso.

- [ ] **Step 4: Run signup and mail Playwright**

Run: `npx playwright test e2e/signup.spec.ts e2e/mail.spec.ts --project=catalog` from `frontend`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/cadastro/page.tsx frontend/src/app/painel/verificar/page.tsx frontend/e2e/mail.spec.ts frontend/e2e/signup.spec.ts frontend/playwright.config.ts
git commit -m "feat: cadastro pede só o que a publicação usa"
```

### Task 3: Confirmação da etapa

- [ ] **Step 1: Run the register HTTP spec and the two Playwright files**

Expected: PASS. Se `catalog.spec.ts` ainda preencher telefone e quebrar, corrigir nesse mesmo passo e rodar `npm run test:e2e` inteiro antes de encerrar.
