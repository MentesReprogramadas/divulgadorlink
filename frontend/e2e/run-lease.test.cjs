const { test } = require('node:test')
const assert = require('node:assert/strict')
const { spawn, spawnSync } = require('node:child_process')
const { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const path = require('node:path')
function cleanup(dir){assert.equal(path.dirname(path.resolve(dir)),path.resolve(tmpdir()));assert.match(path.basename(dir),/^tla-e2e-/);rmSync(dir,{recursive:true,force:true})}
const helper = require.resolve('./run-lease.cjs')
const code = file => `require(${JSON.stringify(helper)}).acquireRunLease(${JSON.stringify(file)});`

test('a second real process is denied before writing shared artifacts; owner exit releases the lease', async () => {
 const dir=mkdtempSync(path.join(tmpdir(),'tla-e2e-lease-')),file=path.join(dir,'runner.lock')
 const first=spawn(process.execPath,['-e',code(file)+"console.log('ready');process.stdin.once('data',()=>process.exit(0))"],{env:{...process.env,TLA_E2E_RUNNER_PID:''}})
 try {
  await new Promise((resolve,reject)=>{first.stdout.once('data',resolve);first.once('error',reject);first.once('exit',status=>{if(status)reject(new Error('owner exited '+status))})})
  const owner=JSON.parse(readFileSync(file,'utf8')).pid
  const second=spawnSync(process.execPath,['-e',code(file)],{encoding:'utf8',env:{...process.env,TLA_E2E_RUNNER_PID:''}})
  assert.notEqual(second.status,0);assert.match(second.stderr,/Outra execução Playwright/);assert.equal(JSON.parse(readFileSync(file,'utf8')).pid,owner)
  const exit=new Promise(resolve=>first.once('exit',resolve));first.stdin.end('done');await exit;assert.equal(existsSync(file),false)
 } finally { if(first.exitCode===null)first.kill();cleanup(dir) }
})
test('a dead owner is recovered without terminating any process',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'tla-e2e-stale-')),file=path.join(dir,'runner.lock')
 try {writeFileSync(file,JSON.stringify({pid:99999999}));const result=spawnSync(process.execPath,['-e',code(file)],{encoding:'utf8',env:{...process.env,TLA_E2E_RUNNER_PID:''}});assert.equal(result.status,0,result.stderr);assert.equal(existsSync(file),false)}finally{cleanup(dir)}
})
test('an incomplete lock is preserved rather than deleting another starting run',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'tla-e2e-starting-')),file=path.join(dir,'runner.lock')
 try {writeFileSync(file,'');const result=spawnSync(process.execPath,['-e',code(file)],{encoding:'utf8',env:{...process.env,TLA_E2E_RUNNER_PID:''}});assert.notEqual(result.status,0);assert.equal(readFileSync(file,'utf8'),'')}finally{cleanup(dir)}
})
