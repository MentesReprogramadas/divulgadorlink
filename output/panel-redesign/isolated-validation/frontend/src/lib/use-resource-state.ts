'use client'
import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'

/** Keep a loaded resource during its refresh; a different resource starts empty. */
export function useResourceState<State extends { kind: string }>(initial: State) {
  const [state, update] = useState(initial)
  const [refreshing, setRefreshing] = useState(false)
  const resource = useRef<string | null>(null)
  const initialState = useRef(initial)
  const start = useCallback((key: string) => {
    const same = resource.current === key
    resource.current = key
    setRefreshing(true)
    update(previous => same && previous.kind === 'ready' ? previous : initialState.current)
  }, [])
  const setState: Dispatch<SetStateAction<State>> = useCallback(value => {
    setRefreshing(false)
    update(value)
  }, [])
  return { state, setState, refreshing, start }
}
