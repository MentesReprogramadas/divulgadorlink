import { prepareAvatar } from '@/features/profiles/prepare-avatar'

export async function prepareLinkMediaFile(file: File, kind: 'icon' | 'image'): Promise<string> {
  if (kind === 'icon') return prepareAvatar(file)
  if (file.size > 5 * 1024 * 1024 || !['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Escolha PNG, JPG ou WebP de até 5 MB.')
  let bitmap: ImageBitmap
  try { bitmap = await createImageBitmap(file) } catch { throw new Error('Não foi possível abrir a imagem. Escolha outra.') }
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width > 8192 || bitmap.height > 8192) throw new Error('Escolha uma imagem com até 8192 px em cada lado.')
    const canvas = document.createElement('canvas'), context = canvas.getContext('2d')
    if (!context) throw new Error('Não foi possível preparar a imagem neste navegador.')
    for (const edge of [1600,1200,800,512]) {
      const scale = Math.min(1,edge/Math.max(bitmap.width,bitmap.height))
      canvas.width=Math.max(1,Math.round(bitmap.width*scale)); canvas.height=Math.max(1,Math.round(bitmap.height*scale))
      context.drawImage(bitmap,0,0,canvas.width,canvas.height)
      const encoded=canvas.toDataURL('image/webp',.82)
      if (!encoded.startsWith('data:image/webp;')) throw new Error('Use um navegador atualizado para preparar a imagem.')
      const base64=encoded.split(',')[1]
      if (base64 && base64.length<=1398104) return base64
    }
    throw new Error('Não foi possível reduzir a imagem. Escolha outra.')
  } finally { bitmap.close() }
}
