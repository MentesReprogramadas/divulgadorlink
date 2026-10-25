import { LinkRow } from '@/components/domain/link-row'
import type { LinkContext } from '@/components/domain/link-meta'
import type { LinkMediaDraft } from '@/features/link-media/link-media-fields'
import styles from './submission-form.module.css'

type SubmissionPreviewProps = LinkContext & {
  name: string
  description: string
  url: string
  media: LinkMediaDraft
}

export function SubmissionPreview({ name, description, url, media, niche, network, discovery }: SubmissionPreviewProps) {
  return <section className={styles.reviewPreview} aria-label="Prévia do link">
    <header className={styles.reviewHeading}><h2>Seu link no catálogo</h2><p>Confira o conteúdo antes de enviar.</p></header>
    <div className={styles.reviewLayout}>
      <div className={styles.cardPreview}><LinkRow preview id="draft-preview" name={name} description={description} placement="organic" showImpressions={false} niche={niche} network={network} discovery={discovery} iconUrl={media.icon ? `data:image/webp;base64,${media.icon.base64}` : null} imageUrl={media.image ? `data:image/webp;base64,${media.image.base64}` : null} imageAlt={media.image?.alt} /></div>
      <div className={styles.reviewNotes}>
        <dl className={styles.review}><div><dt>Link de acesso</dt><dd>{url}</dd></div></dl>
        <p>A prévia mostra os dados do seu rascunho. A publicação segue a análise do envio.</p>
        {media.icon || media.image ? <p>Os anexos aguardarão análise própria e só aparecerão publicamente após aprovação.</p> : <p>Sem imagem, seu card apresenta apenas o conteúdo do link.</p>}
      </div>
    </div>
  </section>
}
