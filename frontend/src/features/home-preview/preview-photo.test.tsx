import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {PreviewPhoto} from './glass-link-card'
import {previewLinks} from './preview-data'

afterEach(()=>{cleanup();vi.restoreAllMocks()})
const link=previewLinks[0]

it('does not mark a lazy image failed before the browser has selected a source',()=>{
 vi.spyOn(HTMLImageElement.prototype,'complete','get').mockReturnValue(true)
 vi.spyOn(HTMLImageElement.prototype,'naturalWidth','get').mockReturnValue(0)
 vi.spyOn(HTMLImageElement.prototype,'currentSrc','get').mockReturnValue('')
 render(<PreviewPhoto link={link}/>)
 expect(screen.getByRole('img',{name:link.imageAlt}).tagName).toBe('IMG')
 expect(screen.queryByRole('img',{name:`Imagem indisponível para ${link.title}`})).toBeNull()
})

it('keeps the fallback for a cached failed image whose source is already selected',()=>{
 vi.spyOn(HTMLImageElement.prototype,'complete','get').mockReturnValue(true)
 vi.spyOn(HTMLImageElement.prototype,'naturalWidth','get').mockReturnValue(0)
 vi.spyOn(HTMLImageElement.prototype,'currentSrc','get').mockReturnValue('http://preview.local/photo/failed')
 render(<PreviewPhoto link={link}/>)
 expect(screen.getByRole('img',{name:`Imagem indisponível para ${link.title}`})).toBeTruthy()
 expect(screen.queryByRole('img',{name:link.imageAlt})).toBeNull()
})

it('keeps a cached loaded image and switches to fallback on a real error event',()=>{
 vi.spyOn(HTMLImageElement.prototype,'complete','get').mockReturnValue(true)
 vi.spyOn(HTMLImageElement.prototype,'naturalWidth','get').mockReturnValue(1400)
 vi.spyOn(HTMLImageElement.prototype,'currentSrc','get').mockReturnValue('http://preview.local/photo/loaded')
 render(<PreviewPhoto link={link}/>)
 const image=screen.getByRole('img',{name:link.imageAlt})
 expect(image.tagName).toBe('IMG')
 fireEvent.error(image)
 expect(screen.getByRole('img',{name:`Imagem indisponível para ${link.title}`})).toBeTruthy()
})
