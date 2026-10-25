import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {ProfilePreviewShell} from './profile-preview-shell'
afterEach(cleanup)
it('aplica a aparência validada e a tinta legível ao aviso de prévia',()=>{
 const view=render(<ProfilePreviewShell appearance={{background:'#173c32'}}>Conteúdo</ProfilePreviewShell>)
 expect(screen.getByRole('main').style.getPropertyValue('--profile-preview-ink')).toBe('#ffffff')
 expect(screen.getByRole('main').style.getPropertyValue('--profile-preview-background')).toBe('#173c32')
 view.rerender(<ProfilePreviewShell appearance={{background:'#ece5ff'}}>Conteúdo</ProfilePreviewShell>)
 expect(screen.getByRole('main').style.getPropertyValue('--profile-preview-ink')).toBe('#000000')
 view.rerender(<ProfilePreviewShell appearance={{background:'url(https://invalid.test)'}}>Conteúdo</ProfilePreviewShell>)
 expect(screen.getByRole('main').style.getPropertyValue('--profile-preview-background')).toBe('#f5f0e8')
})
