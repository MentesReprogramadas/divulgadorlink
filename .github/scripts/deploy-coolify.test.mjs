import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applications, deploy } from './deploy-coolify.mjs'

const sha = 'a'.repeat(40)
const env = {
  COOLIFY_URL: 'https://coolify.example.test', COOLIFY_TOKEN: 'private-token',
  GITHUB_SHA: sha, GITHUB_REPOSITORY: 'MentesReprogramadas/divulgadorlink',
  GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'push', GH_TOKEN: 'github-token',
}
function harness(overrides = {}) {
  const calls = [], pins = new Map()
  const fetcher = async (input, options = {}) => {
    const url = new URL(input), method = options.method ?? 'GET'
    const body = options.body ? JSON.parse(options.body) : null
    calls.push({ url, method, body, options })
    const reply = data => Response.json(data)
    if (url.hostname === 'api.github.com') return reply({ object: { sha: overrides.head ?? sha } })
    if (url.hostname !== 'coolify.example.test') return new Response('', { status: overrides.health ?? 200 })
    if (overrides.httpError) return new Response('private response', { status: 401 })
    if (url.pathname === '/api/v1/deployments') return reply(overrides.pending ?? [])
    if (url.pathname.startsWith('/api/v1/applications/')) {
      const id = url.pathname.split('/').at(-1)
      if (body) { pins.set(id, body.git_commit_sha); return reply({ uuid: id }) }
      return reply({ id:overrides.uuidOnly?undefined:id,uuid:id, git_repository: env.GITHUB_REPOSITORY, git_branch: 'main',
        git_commit_sha: pins.get(id), settings: { is_auto_deploy_enabled: overrides.auto ?? false },
        status: overrides.status ?? 'running:healthy' })
    }
    if (url.pathname === '/api/v1/deploy') return reply({ deployments: [{ resource_uuid: body.uuid, deployment_uuid: 'deploy-' + body.uuid }] })
    if (url.pathname.startsWith('/api/v1/deployments/')) return reply({ status: overrides.deployment ?? 'finished', commit: overrides.commit ?? sha })
    throw new Error('Unexpected request: ' + url.pathname)
  }
  return { calls, run: (values = env) => deploy(values, fetcher, async () => {}) }
}
test('deploys bridge, API, worker and web sequentially at the tested SHA; health calls have no credentials', async () => {
  const h = harness()
  await h.run()
  assert.deepEqual(h.calls.filter(call => call.url.pathname === '/api/v1/deploy').map(call => call.body.uuid), applications.map(app => app.uuid))
  assert.equal(h.calls.filter(call => call.method === 'PATCH').length, applications.length)
  for (const call of h.calls.filter(call => call.method === 'PATCH')) assert.deepEqual(call.body, { git_commit_sha: sha })
  for (const call of h.calls.filter(call => applications.some(app => app.health === call.url.href))) assert.equal(call.options.headers, undefined)
})
test('rejects missing credentials, insecure origins and non-production events before any network call', async () => {
  for (const values of [{ COOLIFY_TOKEN: '' }, { COOLIFY_URL: 'http://coolify.example.test' }, { GITHUB_EVENT_NAME: 'pull_request' }, { GITHUB_REF: 'refs/heads/feature' }]) {
    const h = harness()
    await assert.rejects(h.run({ ...env, ...values }))
    assert.equal(h.calls.length, 0)
  }
})

test('deploys using verified application UUIDs when Coolify omits internal IDs',async()=>{
  const h=harness({uuidOnly:true})
  await h.run()
  assert.deepEqual(h.calls.filter(call=>call.url.pathname==='/api/v1/deploy').map(call=>call.body.uuid),applications.map(app=>app.uuid))
})

test('UUID-only responses still block concurrent deployments and unidentified queue entries before mutations',async()=>{
  for(const pending of [[{application_uuid:applications[0].uuid}],[{application_id:123}],[{application_uuid:123}], [{}]]){
    const h=harness({uuidOnly:true,pending})
    await assert.rejects(h.run(),/already queued|identity unavailable/)
    assert.equal(h.calls.some(call=>call.method!=='GET'),false)
  }
})
test('superseded commits skip all Coolify requests', async () => {
  const h = harness({ head: 'b'.repeat(40) }); await h.run()
  assert.equal(h.calls.length, 1)
})
test('auto-deploy or an existing deployment blocks every mutation', async () => {
  for (const options of [{ auto: true }, { pending: [{ application_id: applications[0].uuid }] }, { pending: [{ application_uuid: applications[0].uuid }] }]) {
    const h = harness(options); await assert.rejects(h.run())
    assert.equal(h.calls.some(call => call.method !== 'GET'), false)
  }
})
test('failed deployment, wrong SHA, unhealthy service or timeout prevents deploying the next service', async () => {
  for (const options of [{ deployment: 'failed' }, { commit: 'b'.repeat(40) }, { status: 'exited' }, { health: 503 }, { deployment: 'in_progress' }]) {
    const h = harness(options); await assert.rejects(h.run())
    const firstHealthIndex = applications.findIndex(app => app.health)
    assert.equal(h.calls.filter(call => call.url.pathname === '/api/v1/deploy').length, options.health ? firstHealthIndex + 1 : 1)
  }
})
test('API errors do not expose response bodies or tokens', async () => {
  const h = harness({ httpError: true })
  await assert.rejects(h.run(), error => error.message.includes('HTTP 401') && !/private|token/.test(error.message))
})
