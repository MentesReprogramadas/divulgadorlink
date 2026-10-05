import Redis, { type RedisOptions } from 'ioredis'

export function createRedis(url: string, options: RedisOptions = {}): Redis {
  return new Redis(url, {
    ...options,
    // A rede privada do Railway só resolve em IPv6. family 0 deixa o Node
    // escolher o stack. Em localhost o resultado continua sendo IPv4.
    family: 0,
  })
}
