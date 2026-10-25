import { WorkspaceSection } from '@/components/layout/workspace-section'
import { LiquidLens } from '@/components/ui/liquid-lens'
import styles from '@/components/layout/workspace-dashboard.module.css'

export function DashboardShortcuts() {
  return <WorkspaceSection title="O que você quer fazer?">
    <div className={styles.shortcuts}><a href="/painel/perfil"><LiquidLens radius={16} /><strong>Montar minha página →</strong><span>Uma página com os seus links.</span></a><a href="/painel/convites"><LiquidLens radius={16} /><strong>Criar um link permanente →</strong><span>Atualize o destino sem trocar o endereço.</span></a><a href="/painel/pedidos"><LiquidLens radius={16} /><strong>Consultar pedidos →</strong><span>Veja pagamentos e destaques.</span></a></div>
  </WorkspaceSection>
}
