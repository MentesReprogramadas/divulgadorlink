import { describe, expect, it } from 'vitest'
import { openPublicLink } from '@/use-cases/@Links/open-public-link'

describe('página do link', () => {
  it('não abre nem redireciona link indisponível', () => {
    expect(openPublicLink({ status: 'UNAVAILABLE' })).toEqual({ visible: false, redirect: false })
  })

  it('abre o publicado sem contar a abertura como clique', () => {
    expect(openPublicLink({ status: 'PUBLISHED' })).toEqual({ visible: true, redirect: false })
  })
})
