'use client'

import { useId, useState } from 'react'
import { ActionIcon } from './action-icon'
import { Button } from './button'
import styles from './image-upload.module.css'

type ImageUploadProps = { label: string; imageUrl?: string; onChoose: (file: File) => void; onRemove: () => void; disabled?: boolean }
export function ImageUpload({ label, imageUrl, onChoose, onRemove, disabled }: ImageUploadProps) {
  const id = useId(), [dragging, setDragging] = useState(false)
  return <div className={styles.upload}>
    <span className={styles.title}>{label}</span>
    <label htmlFor={id} className={styles.dropzone} data-dragging={dragging || undefined}
      onDragOver={event => { event.preventDefault(); if (!disabled) setDragging(true) }} onDragLeave={() => setDragging(false)}
      onDrop={event => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file && !disabled) onChoose(file) }}>
      {imageUrl ? <img src={imageUrl} alt="Foto atual do perfil" width={72} height={72} /> : <span className={styles.placeholder}><ActionIcon name="image" width={30} height={30} /></span>}
      <span><strong>{imageUrl ? 'Trocar foto' : 'Escolher foto'}</strong><small>Toque para escolher ou arraste uma imagem.</small></span>
      <input id={id} aria-label={label} type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled} aria-describedby={id + '-hint'} onChange={event => { const file = event.target.files?.[0]; if (file) onChoose(file); event.target.value = '' }} />
    </label>
    <p id={id + '-hint'}>PNG, JPG ou WebP até 5 MB. Comprimida automaticamente em WebP. Vai ao ar após publicar.</p>
    {imageUrl ? <Button type="button" variant="secondary" disabled={disabled} onClick={onRemove}><ActionIcon name="trash" />Remover foto</Button> : null}
  </div>
}
