'use client'

import { Input } from '@/components/ui/input'
import { formatCents } from '@/domain/money'
import type { PromotionSurface } from '@/domain/promotion-upgrade'
import styles from './promotion-checkout.module.css'

type PromotionUpgradeProps = {
  durationDays: number
  additionalCents: number
  totalCents: number
  missingSurfaces: readonly PromotionSurface[]
  onSelect: () => void
  compact?: boolean
  selected?: boolean
  disabled?: boolean
}
const NAMES: Record<PromotionSurface, string> = { SEARCH: 'Busca', NICHE: 'Nicho', HOME: 'Home' }

export function PromotionUpgrade({ durationDays, additionalCents, totalCents, missingSurfaces, onSelect, compact = false, selected = false, disabled = false }: PromotionUpgradeProps) {
  const homeOnly = missingSurfaces.length === 1 && missingSurfaces[0] === 'HOME'
  const names = missingSurfaces.map(surface => NAMES[surface]).join(' + ')
  return <label className={styles.upgrade} data-compact={compact} data-selected={selected}>
    <span className={styles.upgradeTitle}>
      <Input type="checkbox" aria-label={homeOnly ? 'Adicionar a Home ao destaque' : `Adicionar ${names} ao destaque`} disabled={disabled} checked={selected} onChange={onSelect} />
      <strong>{selected ? homeOnly ? 'Home adicionada' : `${names} adicionado` : homeOnly ? 'Adicione a Home' : `Adicione ${names}`}</strong>
      {selected && compact ? <span className={styles.removeUpgrade}>Remover</span> : null}
    </span>
    {!compact ? <span>{homeOnly ? `Seu link também na página inicial, pelos mesmos ${durationDays} dias.` : `Inclua ${names} pelos mesmos ${durationDays} dias.`}</span> : null}
    <strong className={styles.upgradePrice}>{additionalCents > 0 ? `Por mais ${formatCents(additionalCents)}` : 'Sem custo adicional'}</strong>
    {!compact ? <span className={styles.upgradeTotal}>{homeOnly ? 'Total com Home' : 'Total do pacote'}: {formatCents(totalCents)}</span> : null}
    {!compact ? <span className={styles.upgradeHint}>{selected ? 'Remover' : 'Toque em qualquer parte deste card para adicionar.'}</span> : null}
  </label>
}
