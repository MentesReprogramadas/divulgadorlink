const fs = require('node:fs')
const path = require('node:path')
const defaultFile = path.join(__dirname, '.runtime', 'runner.lock')

// Ports and container names can differ, but state.json, build and traces are shared.
exports.acquireRunLease = function acquireRunLease(file = defaultFile) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  for (let attempt = 0; attempt < 2; attempt++) {
    let descriptor
    try { descriptor = fs.openSync(file, 'wx') } catch (error) {
      if (error.code !== 'EEXIST') throw error
      let owner
      try { owner = JSON.parse(fs.readFileSync(file, 'utf8')) } catch {
        throw new Error('Outra execução E2E está iniciando. Aguarde antes de repetir.')
      }
      if (owner.pid === process.pid || String(owner.pid) === process.env.TLA_E2E_RUNNER_PID) return
      if (!Number.isSafeInteger(owner.pid) || owner.pid <= 0) throw new Error('Lock E2E inválido; não foi removido.')
      let alive = true
      try { process.kill(owner.pid, 0) } catch (reason) { if (reason.code === 'ESRCH') alive = false; else throw reason }
      if (alive) throw new Error(`Outra execução Playwright está ativa neste projeto (PID ${owner.pid}). Aguarde: sessões, build e traces são compartilhados.`)
      fs.unlinkSync(file)
      continue
    }
    fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid }))
    fs.closeSync(descriptor)
    process.env.TLA_E2E_RUNNER_PID = String(process.pid)
    process.once('exit', () => {
      try { if (JSON.parse(fs.readFileSync(file, 'utf8')).pid === process.pid) fs.unlinkSync(file) } catch { /* another owner is never removed */ }
    })
    return
  }
  throw new Error('Não foi possível reservar o ambiente E2E; tente após a outra execução.')
}
