/** Normalize locally: originals/EXIF are never uploaded; backend independently validates the resulting WebP. */
export async function prepareAvatar(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Escolha uma foto PNG, JPG ou WebP de até 5 MB.')
  let image: ImageBitmap
  try { image = await createImageBitmap(file) } catch { throw new Error('Não foi possível abrir a foto. Escolha outra imagem.') }
  try {
    if (!image.width || !image.height || image.width > 8192 || image.height > 8192) throw new Error('Escolha uma foto com até 8192 px em cada lado.')
    const canvas = document.createElement('canvas'), context = canvas.getContext('2d')
    if (!context) throw new Error('Não foi possível preparar a foto neste navegador.')
    for (const edge of [512, 384, 256, 128]) {
      const scale = Math.min(1, edge / Math.max(image.width, image.height))
      canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale))
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const encoded = canvas.toDataURL('image/webp', 0.82)
      if (!encoded.startsWith('data:image/webp;')) throw new Error('Seu navegador não consegue converter a foto para WebP. Tente um navegador atualizado.')
      const base64 = encoded.split(',')[1]
      if (base64 && base64.length <= 349524) return base64
    }
    throw new Error('Não foi possível reduzir a foto. Escolha outra imagem.')
  } finally { image.close() }
}
