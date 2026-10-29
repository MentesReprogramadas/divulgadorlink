import { setTimeout as delay } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'

// UUIDs verified against the Tem Link Aqui project through Coolify MCP.
export const applications = [
  { name: 'affiliate-bridge', uuid: 'jqxvail1shmqtyjoyzeyktxq' },
  { name: 'api', uuid: '3rzvngm8sz51yjj4i3jmtr1i', health: 'https://api.temlinkaqui.com/api/v1/actuator/ready' },
  { name: 'worker', uuid: 'w7uioamyuv4tsjmelv6fqqkh' },
  { name: 'web', uuid: 'mfehvi9lulpppun6laezsu0w', health: 'https://temlinkaqui.com/health' },
]

export async function deploy(env = process.env, fetcher = fetch, sleep = delay) {
  for (const key of ['COOLIFY_URL', 'COOLIFY_TOKEN', 'GITHUB_SHA', 'GITHUB_REPOSITORY', 'GH_TOKEN']) {
    if (!env[key]) throw new Error(`Missing ${key}; follow docs/ci-cd.md`)
  }
  if (env.GITHUB_REF !== 'refs/heads/main' || env.GITHUB_EVENT_NAME !== 'push' || !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA)) {
    throw new Error('Only a tested push to main may deploy')
  }
  const base = new URL(env.COOLIFY_URL)
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) {
    throw new Error('COOLIFY_URL must be an HTTPS origin')
  }
  async function api(route, method = 'GET', body) {
    const response = await fetcher(new URL('/api/v1' + route, base), {
      method, redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${env.COOLIFY_TOKEN}`, 'content-type': 'application/json', accept: 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    // Never echo API response bodies: application details and logs can contain secrets.
    if (!response.ok) throw new Error(`Coolify ${method} ${route}: HTTP ${response.status}`)
    return response.json()
  }
  async function currentHead() {
    const response = await fetcher(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/git/ref/heads/main`, {
      redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${env.GH_TOKEN}`, accept: 'application/vnd.github+json' },
    })
    if (!response.ok) throw new Error(`GitHub main: HTTP ${response.status}`)
    return (await response.json()).object.sha
  }
  if (await currentHead() !== env.GITHUB_SHA) {
    console.log('Superseded commit; production deployment skipped')
    return
  }
  const applicationIds = new Set()
  for (const app of applications) {
    const state = await api('/applications/' + app.uuid)
    if (state.git_repository !== env.GITHUB_REPOSITORY || state.git_branch !== 'main' || state.settings?.is_auto_deploy_enabled !== false) {
      throw new Error(`${app.name}: repository/main mismatch or auto-deploy still enabled; follow docs/ci-cd.md`)
    }
    if (state.id !== undefined && state.id !== null) applicationIds.add(String(state.id))
    else if(state.uuid!==app.uuid) throw new Error(`${app.name}: application UUID missing or mismatched`)
  }
  const pending = await api('/deployments')
  if (!Array.isArray(pending)) throw new Error('Unexpected Coolify deployment queue response')
  if (pending.some(row => applicationIds.has(String(row.application_id)) || applications.some(app => app.uuid === row.application_uuid))) {
    throw new Error('A production deployment is already queued/running; wait before retrying')
  }
  if(pending.some(row=>(typeof row.application_uuid!=='string'||!row.application_uuid)&&(applicationIds.size!==applications.length||row.application_id===undefined||row.application_id===null))){
    throw new Error('Deployment queue identity unavailable; inspect Coolify before retrying')
  }
  for (const app of applications) {
    await api('/applications/' + app.uuid, 'PATCH', { git_commit_sha: env.GITHUB_SHA })
    const pinned = await api('/applications/' + app.uuid)
    if (pinned.git_commit_sha !== env.GITHUB_SHA) throw new Error(`${app.name}: commit pin was not saved`)
    const queued = await api('/deploy', 'POST', { uuid: app.uuid })
    const id = queued.deployments?.find(row => row.resource_uuid === app.uuid)?.deployment_uuid
    if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) throw new Error(`${app.name}: deployment UUID missing`)
    let finished = false
    for (let attempt = 0; attempt < 60; attempt++) {
      const result = await api('/deployments/' + id)
      if (['failed', 'cancelled', 'canceled'].includes(result.status)) throw new Error(`${app.name}: deployment ${id} ${result.status}`)
      if (result.status === 'finished') {
        if (result.commit !== env.GITHUB_SHA) throw new Error(`${app.name}: deployed commit differs from tested commit`)
        finished = true
        break
      }
      await sleep(10_000)
    }
    if (!finished) throw new Error(`${app.name}: deployment ${id} timed out; inspect Coolify before retrying`)
    let healthy = false
    for (let attempt = 0; attempt < 12; attempt++) {
      const state = await api('/applications/' + app.uuid)
      healthy = app.health ? state.status === 'running:healthy' : ['running:healthy', 'running:unknown'].includes(state.status)
      if (healthy && app.health) {
        try {
          const response = await fetcher(app.health, { redirect: 'error', signal: AbortSignal.timeout(10_000) })
          healthy = response.status === 200
          await response.body?.cancel()
        } catch { healthy = false }
      }
      if (healthy) break
      await sleep(5_000)
    }
    if (!healthy) throw new Error(`${app.name}: deployment finished but health check failed`)
    console.log(`${app.name}: ${env.GITHUB_SHA} deployed; ${app.health ? 'health check passed' : 'process running (no worker readiness probe)'}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  deploy().catch(error => { console.error(error.message); process.exitCode = 1 })
}
