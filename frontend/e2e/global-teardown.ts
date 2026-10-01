import { readFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

function killTree(pid: string): void {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', pid, '/t', '/f'], { stdio: 'ignore', shell: true })
    return
  }
  try {
    process.kill(-Number(pid), 'SIGKILL')
  } catch {
    try {
      process.kill(Number(pid), 'SIGKILL')
    } catch {
      // o servidor já saiu
    }
  }
}

export default function globalTeardown(): void {
  const pidPath = path.join(__dirname, 'serve.pid')
  try {
    killTree(readFileSync(pidPath, 'utf8').trim())
  } catch {
    // o servidor já saiu
  }
}
