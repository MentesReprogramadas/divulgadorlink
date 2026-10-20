import {afterEach,expect,it,vi} from 'vitest'
import {readShareKitState} from './share-kit-api'
import {emptyProfile} from '@/features/profiles/profile-contract'
const {read,published}=vi.hoisted(()=>({read:vi.fn(),published:vi.fn()}))
vi.mock('@/features/profiles/profile-api',()=>({profileRequest:read,publicProfileRequest:published}))
afterEach(()=>vi.resetAllMocks())
const content={...emptyProfile(),slug:'ana',name:'Público'},state={draft:{...content,name:'private-draft'},publishedContent:content,publishedVersion:1}
it('F32-I01/T04 usa projeção pública e bloqueia idade/revisão divergente sem fallback privado',async()=>{read.mockResolvedValue(state);published.mockResolvedValueOnce({restricted:true});await expect(readShareKitState('published')).rejects.toThrow('Confirme a idade');published.mockResolvedValueOnce({...content,restricted:false,publishedRevisionId:2});await expect(readShareKitState('published')).rejects.toThrow('publicação mudou');published.mockResolvedValueOnce({...content,name:'Projeção atual',restricted:false,publishedRevisionId:1});expect((await readShareKitState('published')).publishedContent?.name).toBe('Projeção atual')})
it('F32-I02 permissão é reconferida; rascunho não consulta o público e não vira origem padrão',async()=>{read.mockRejectedValueOnce(new Error('Acesso removido'));await expect(readShareKitState('published')).rejects.toThrow('Acesso removido');expect(published).not.toHaveBeenCalled();read.mockResolvedValue(state);expect((await readShareKitState('draft')).draft?.name).toBe('private-draft');expect(published).not.toHaveBeenCalled()})
