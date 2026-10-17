import { act, renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'
import { useResourceState } from './use-resource-state'

type State = { kind: 'loading' | 'denied' } | { kind: 'ready'; name: string }
it('preserva o recurso durante atualização e descarta os dados ao trocar de recurso ou perder acesso', () => {
  const { result } = renderHook(() => useResourceState<State>({ kind: 'loading' }))
  act(() => result.current.start('link-a'))
  act(() => result.current.setState({ kind: 'ready', name: 'Comunidade A' }))
  act(() => result.current.start('link-a'))
  expect(result.current.refreshing).toBe(true)
  expect(result.current.state).toEqual({ kind: 'ready', name: 'Comunidade A' })
  act(() => result.current.start('link-b'))
  expect(result.current.state).toEqual({ kind: 'loading' })
  act(() => result.current.setState({ kind: 'ready', name: 'Comunidade B' }))
  act(() => result.current.setState({ kind: 'denied' }))
  expect(result.current.state).toEqual({ kind: 'denied' })
  expect(result.current.refreshing).toBe(false)
})
