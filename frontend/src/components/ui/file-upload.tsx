'use client'

import { useId, useState, type ReactNode, type Ref } from 'react'
import { ActionIcon } from './action-icon'
import { useReadOnly } from './interaction-policy'
import styles from './file-upload.module.css'

type FileUploadProps = {
  label: string; accept: string; onChoose: (file: File) => void; disabled?: boolean
  title?: string; description?: string; hint?: string; error?: string
  visual?: ReactNode; inputRef?: Ref<HTMLInputElement>
}

export function FileUpload({ label, accept, onChoose, disabled=false, title='Escolher arquivo', description='ou arraste o arquivo aqui', hint, error, visual, inputRef }: FileUploadProps) {
  const id = useId(), [dragging, setDragging] = useState(false), readOnly = useReadOnly()
  const unavailable = disabled || readOnly
  return <div className={styles.upload}>
    <span className={styles.title}>{label}</span>
    <label htmlFor={id} className={styles.dropzone} data-disabled={unavailable || undefined} data-dragging={dragging || undefined}
      onDragOver={event => { event.preventDefault(); if (!unavailable) setDragging(true) }} onDragLeave={() => setDragging(false)}
      onDrop={event => { event.preventDefault(); setDragging(false); const file=event.dataTransfer.files[0]; if(file&&!unavailable) onChoose(file) }}>
      {visual ?? <span className={styles.placeholder}><ActionIcon name="importLinks" width={30} height={30}/></span>}
      <span className={styles.fileText}><strong>{title}</strong><small>{description}</small></span>
      <input ref={inputRef} id={id} aria-label={label} type="file" accept={accept} disabled={unavailable} aria-invalid={Boolean(error) || undefined} aria-describedby={error || hint ? id+'-hint' : undefined}
        onChange={event => { const file=event.target.files?.[0]; if(file&&!unavailable) onChoose(file); event.target.value='' }}/>
    </label>
    {error ? <p id={id+'-hint'} role="alert" className={styles.error}>{error}</p> : hint ? <p id={id+'-hint'}>{hint}</p> : null}
  </div>
}
