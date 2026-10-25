import {cleanup,render} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {ProfilePreviewSkeleton} from './profile-preview-skeleton'
vi.mock('@/components/layout/ondas-atmosphere',()=>({OndasAtmosphere:()=> <div data-platform-atmosphere/>}))
afterEach(cleanup)
it('usa skeletons de prévia sem apresentar a atmosfera da plataforma antes do tema pessoal',()=>{
 const {container}=render(<ProfilePreviewSkeleton/>)
 expect(container.querySelector('[data-skeleton]')).not.toBeNull()
 expect(container.querySelector('[data-platform-atmosphere]')).toBeNull()
 expect(container.textContent).not.toContain('Carregando página')
})
