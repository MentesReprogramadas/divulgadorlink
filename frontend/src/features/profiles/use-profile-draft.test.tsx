import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { emptyProfile } from './profile-contract'
import { useProfileDraft } from './use-profile-draft'
import { ProfileRequestError } from './profile-api'
const request = vi.hoisted(() => vi.fn())
vi.mock('./profile-api', async original => ({ ...await original<typeof import('./profile-api')>(), profileRequest: request }))
afterEach(() => { cleanup(); vi.useRealTimers(); request.mockReset() })
const original = { ...emptyProfile(), slug: 'ana-estudos', name: 'Ana', version: 1 }
it('serializa edições durante uma escrita e avança a versão sem substituir o texto mais recente', async () => {
  let complete: (value: unknown) => void = () => {}
  request.mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
  request.mockImplementationOnce(async (_path, init) => ({ draft: { ...JSON.parse(init.body).content, version: 3 }, publishedVersion: null }))
  const { result } = renderHook(useProfileDraft)
  act(() => { result.current.replace({ draft: original, publishedVersion: null }); result.current.change({ ...original, bio: 'Primeira' }) })
  let writing: Promise<unknown> = Promise.resolve()
  act(() => { writing = result.current.flush() })
  act(() => result.current.change({ ...original, bio: 'Mais recente' }))
  await act(async () => { complete({ draft: { ...original, bio: 'Primeira', version: 2 }, publishedVersion: null }); await writing })
  expect(request).toHaveBeenCalledTimes(2)
  expect(JSON.parse(request.mock.calls[1][1].body).expectedVersion).toBe(2)
  expect(result.current.draft.bio).toBe('Mais recente'); expect(result.current.draft.version).toBe(3)
})
it('409 bloqueia retentativa automática e mantém o rascunho local', async () => {
  vi.useFakeTimers(); request.mockRejectedValue(new ProfileRequestError('Outra aba.', 409))
  const { result } = renderHook(useProfileDraft)
  act(() => { result.current.replace({ draft: original, publishedVersion: null }); result.current.change({ ...original, bio: 'Local' }) })
  await act(async () => { await vi.advanceTimersByTimeAsync(701) })
  expect(result.current.error).toBe('Outra aba.')
  act(() => result.current.change({ ...original, bio: 'Local preservado' }))
  await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
  expect(request).toHaveBeenCalledTimes(1); expect(result.current.draft.bio).toBe('Local preservado')
})
it('F20 autosave on leaving a shared page keeps its original resource selector',async()=>{
 vi.useFakeTimers();request.mockImplementation(async(_path,init)=>({draft:{...JSON.parse(init.body).content,version:2},publishedVersion:null}));const {result,unmount}=renderHook(()=>useProfileDraft('original-resource'))
 act(()=>{result.current.replace({draft:original,publishedVersion:null});result.current.change({...original,bio:'Alteração pendente'})});window.history.replaceState(null,'','/painel/equipe/another-resource/editar');unmount();await act(async()=>{await Promise.resolve()});expect(request.mock.calls[0][1].headers['x-profile-id']).toBe('original-resource');window.history.replaceState(null,'','/')
})
