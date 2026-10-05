const DEFAULT_SERVICE = 'divulgador-links-api'

export function shouldRegisterHyperDX(env: NodeJS.ProcessEnv): boolean {
  if (env.NODE_ENV === 'test') return false
  return typeof env.HDX_API_KEY === 'string' && env.HDX_API_KEY.trim().length > 0
}

export function hyperdxServiceName(argv: readonly string[], configured?: string): string {
  const base = configured?.trim() ? configured.trim() : DEFAULT_SERVICE
  const entry = argv.join(' ').replace(/\\/g, '/')
  const isWorker = /(?:^|[\s/])worker\.(?:ts|js|mjs|cjs)(?:\s|$)/.test(entry)
  if (!isWorker) return base
  if (base.endsWith('-worker')) return base
  if (base.endsWith('-api')) return `${base.slice(0, -4)}-worker`
  return `${base}-worker`
}

export function isActuatorProbe(url: string | undefined): boolean {
  if (!url) return false
  const path = url.split('?')[0]
  return path.endsWith('/actuator/health')
    || path.endsWith('/actuator/live')
    || path.endsWith('/actuator/ready')
}

export function redisStatement(cmdName: string, cmdArgs: ReadonlyArray<unknown>): string {
  const raw = cmdArgs[0]
  const key = typeof raw === 'string' ? raw : Buffer.isBuffer(raw) ? raw.toString('utf8') : ''
  const separator = key.lastIndexOf(':')
  if (separator <= 0) return cmdName
  return `${cmdName} ${key.slice(0, separator)}`
}
