import { runtime as e2eRuntime } from './runtime.cjs'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

function killTree(pid: string): void {
  if (!/^\d+$/.test(pid)) return
  // serve.pid can be replaced by a concurrent runner. Never stop its server.
  const parent = process.platform === 'win32'
    ? spawnSync('powershell.exe', ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}').ParentProcessId`], { encoding: 'utf8' })
    : spawnSync('ps', ['-o', 'ppid=', '-p', pid], { encoding: 'utf8' })
  if (parent.status !== 0 || Number(parent.stdout?.trim()) !== process.pid) return
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
  spawnSync('docker', ['rm', '-f', e2eRuntime.pgContainer, e2eRuntime.redisContainer], { stdio: 'ignore', shell: true })
}
