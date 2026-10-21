import { isIP } from 'node:net'

function isPrivateIPv4(host: string): boolean {
  const [a, b] = host.split('.').map(Number)
  return (
    a === 10
    || a === 0
    || a === 127
    || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
  )
}

function mappedIPv4(host: string): string | null {
  if (!host.startsWith('::ffff:')) return null
  const embedded = host.slice('::ffff:'.length)
  if (isIP(embedded) === 4) return embedded
  const parts = embedded.split(':')
  if (parts.length !== 2) return null
  const high = Number.parseInt(parts[0] || '', 16)
  const low = Number.parseInt(parts[1] || '', 16)
  if (Number.isNaN(high) || Number.isNaN(low)) return null
  return `${(high >> 8) & 255}.${high & 255}.${(low >> 8) & 255}.${low & 255}`
}

function isPrivate(host: string): boolean {
  const bare = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (bare === 'localhost' || bare.endsWith('.localhost') || bare.endsWith('.local')) return true

  const mapped = mappedIPv4(bare)
  if (mapped) return isPrivateIPv4(mapped)

  if (isIP(bare) === 4) return isPrivateIPv4(bare)

  if (isIP(bare) === 6) {
    return !/^[23]/.test(bare)
  }

  return false
}

export function assertPublicHttps(raw: string): true {
  const url = new URL(raw)
  if (url.protocol !== 'https:') throw new Error('somente https')
  if (url.username || url.password) throw new Error('credenciais na URL')
  if (url.port && url.port !== '443') throw new Error('porta')
  if (isPrivate(url.hostname)) throw new Error('destino privado')
  return true
}

export function assertResolvedAddresses(addresses: string[]): true {
  if (addresses.length === 0) throw new Error('dns vazio')
  if (addresses.some(address => isIP(address.replace(/^\[|\]$/g, '')) === 0)) throw new Error('dns inválido')
  if (addresses.some(isPrivate)) throw new Error('destino privado')
  return true
}
