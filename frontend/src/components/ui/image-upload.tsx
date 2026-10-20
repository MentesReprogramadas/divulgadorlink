'use client'

import { ActionIcon } from './action-icon'
import { Button } from './button'
import { FileUpload } from './file-upload'
import styles from './file-upload.module.css'

type ImageUploadProps = { label: string; imageUrl?: string; onChoose: (file: File) => void; onRemove: () => void; disabled?: boolean }
export function ImageUpload({ label, imageUrl, onChoose, onRemove, disabled }: ImageUploadProps) {
  return <div className={styles.upload}>
    <FileUpload label={label} accept="image/png,image/jpeg,image/webp" disabled={disabled} onChoose={onChoose}
      title={imageUrl ? 'Trocar foto' : 'Escolher foto'} description="Toque para escolher ou arraste uma imagem."
      hint="PNG, JPG ou WebP até 5 MB. Comprimida automaticamente em WebP. Vai ao ar após publicar."
      visual={imageUrl ? <img src={imageUrl} alt="Foto atual do perfil" width={72} height={72}/> : <span className={styles.placeholder}><ActionIcon name="image" width={30} height={30}/></span>}/>
    {imageUrl ? <Button type="button" variant="secondary" disabled={disabled} onClick={onRemove}><ActionIcon name="trash" />Remover foto</Button> : null}
  </div>
}
