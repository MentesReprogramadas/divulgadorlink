import { AsyncLocalStorage } from 'node:async_hooks'

// Request-scoped, never a process-wide switch: concurrent normal sessions keep
// their original connection pool and permissions.
export const supportReadContext = new AsyncLocalStorage<boolean>()

export function supportDatabaseUrl(raw: string): string {
  const url = new URL(raw)
  const options = url.searchParams.get('options') ?? ''
  url.searchParams.set('options', `${options} -c default_transaction_read_only=on`.trim())
  url.searchParams.set('connection_limit', '2')
  return url.toString()
}
