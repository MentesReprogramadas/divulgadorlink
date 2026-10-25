import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Button, ButtonLink } from './button'
import { Field, Input, Select, TextArea } from './input'
import { Badge } from './badge'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { Loading } from '@/components/feedback/loading'
import { AdvertiseLanding } from '@/features/acquisition/components/advertise-landing'
import { useState } from 'react'
import { Tabs } from './tabs'
import { FormSteps } from './form-steps'
import { WorkspaceActions, WorkspaceFilters } from '@/components/layout/workspace-controls'
import { RefreshButton } from '@/components/layout/workspace-actions'
import PageError from '@/app/error'
import { DetailSkeleton, FormSkeleton, RecordsSkeleton } from '@/components/layout/workspace-skeleton'
import { OverlayDialog } from './overlay-dialog'
import { ReportTable } from './report-view'
import { SupportBanner } from '@/features/support/support-banner'
import { SuspendedAccount } from '@/features/account/components/area-frame'
import { LiquidLens } from './liquid-lens'
import { RoutePending } from '@/components/layout/route-pending'
import { GlobalErrorContent } from '@/app/global-error-content'
import globalErrorStyles from '@/app/global-error.module.css'

const meta = { title: 'Design System/Controles', component: Button, parameters: { layout: 'padded' } } satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = { args: { children: 'Salvar alterações', variant: 'primary' } }
export const Secondary: Story = { args: { children: 'Voltar', variant: 'secondary' } }
export const Danger: Story = { args: { children: 'Excluir conta', variant: 'danger' } }
export const Ghost: Story = { args: { children: 'Mais opções', variant: 'ghost' } }
export const Disabled: Story = { args: { children: 'Enviar', disabled: true } }
export const Pending: Story = { args: { children: 'Enviar', loading: true } }
export const Navigation: Story = { render: () => <ButtonLink href="/painel/links/novo">Novo link</ButtonLink> }
export const Fields: Story = {
  render: () => <form className="auth-form">
    <Field label="Nome" hint="Use um nome que explique o conteúdo."><Input placeholder="Nome do seu link" /></Field>
    <Field label="URL" error="Informe uma URL pública que comece com https://."><Input type="url" defaultValue="meu-link" /></Field>
    <Field label="Rede"><Select><option>Escolha</option><option>Site</option></Select></Field>
    <Field label="Descrição"><TextArea /></Field>
    <Field label="Indisponível"><Input disabled value="Aguardando confirmação" readOnly /></Field>
  </form>,
}
export const Feedback: Story = {
  render: () => <section><h2>Estados da interface</h2><Loading /><EmptyState>Nenhum link publicado</EmptyState><ErrorState onRetry={() => undefined} /><Badge>Publicado</Badge></section>,
}
export const Acquisition: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <AdvertiseLanding cta={{ href: '/cadastro', label: 'Publicar um link' }} />,
}

function TabbedListsExample() {
  const [tab, setTab] = useState('favorites')
  return <Tabs label="Favoritos e coleções" value={tab} onChange={setTab} items={[{ id: 'favorites', label: 'Favoritos', content: <EmptyState /> }, { id: 'collections', label: 'Coleções', content: <EmptyState action={<Button>Nova coleção</Button>} /> }]} />
}
function StepProgressExample() {
  const [step, setStep] = useState(0)
  return <div style={{ display: 'grid', gap: 24, maxWidth: 480 }}><FormSteps labels={['Sua página', 'Foto e acesso', 'Grupos e links', 'Publicar']} current={step} onBack={setStep} /><Button onClick={() => setStep((step + 1) % 4)}>Continuar</Button></div>
}
export const TabbedLists: Story = { render: () => <TabbedListsExample /> }
export const StepProgress: Story = { render: () => <StepProgressExample /> }
export const WorkspaceControls: Story = { render: () => <div style={{ display: 'grid', gap: 24 }}><WorkspaceActions><Button>Novo link</Button><RefreshButton onClick={() => undefined} /></WorkspaceActions><WorkspaceFilters label="Filtrar links"><Field label="Buscar"><Input placeholder="Título do link" /></Field><Field label="Situação"><Select><option value="all">Todos</option><option value="published">Publicados</option><option value="review">Em revisão</option><option value="disabled" disabled>Indisponível</option></Select></Field></WorkspaceFilters><EmptyState /></div> }

export const PageFailure: Story = { render: () => <PageError error={new Error('Falha local de demonstração')} reset={() => undefined} /> }
export const PagePending: Story = { render: () => <RoutePending /> }
export const GlobalFailure: Story = { parameters: { layout: 'fullscreen' }, render: () => <div className={globalErrorStyles.body}><GlobalErrorContent /></div> }
export const WorkspaceSkeletons: Story = { render: () => <div style={{ display: 'grid', gap: 24 }}><h1>Carregamento das áreas</h1><FormSkeleton fields={2} /><DetailSkeleton /><RecordsSkeleton count={1} /><RecordsSkeleton kind="orders" count={1} /></div> }
function ConfirmationExample() {
  const [open, setOpen] = useState(false)
  return <><Button variant="danger" onClick={() => setOpen(true)}>Excluir exemplo</Button><OverlayDialog open={open} title="Excluir exemplo?" onClose={() => setOpen(false)}><p>Esta confirmação é uma demonstração sem dados reais.</p><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button variant="danger" onClick={() => setOpen(false)}>Confirmar exclusão</Button></OverlayDialog></>
}
export const Confirmation: Story = { render: () => <ConfirmationExample /> }
export const Choices: Story = { render: () => <fieldset style={{ display: 'grid', gap: 16, border: 0 }}><legend>Opções de publicação</legend><label><Input type="checkbox" /> Permitir contato</label><label><Input type="checkbox" defaultChecked /> Visível no catálogo</label><label><Input type="checkbox" disabled /> Indisponível</label><label><Input type="radio" name="distribution" value="equal" defaultChecked /> Dividir por igual</label><label><Input type="radio" name="distribution" value="custom" /> Priorizar destinos</label><label><Input type="radio" disabled /> Opção indisponível</label></fieldset> }
export const Report: Story = { render: () => <ReportTable label="Publicações" rows={[{ id: 'one', title: 'Comunidade de criação e referências', date: '15/10/2026', status: 'Publicado', views: '1.250' }]} rowKey={row => row.id} columns={[{ label: 'Comunidade', render: row => row.title }, { label: 'Publicação', render: row => row.date }, { label: 'Situação', render: row => row.status }, { label: 'Visualizações', render: row => row.views, numeric: true }]} /> }
export const SupportMode: Story = { render: () => <SupportBanner /> }
export const Suspended: Story = { render: () => <SuspendedAccount reason="Publicação em análise pela equipe da plataforma." /> }
export const Notice: Story = { render: () => <p className="toast" role="status"><LiquidLens radius={12}/>Alterações salvas. Seu rascunho continua privado.</p> }
export const Badges: Story = { render: () => <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}><Badge>Rascunho</Badge><Badge tone="ok">Publicado</Badge><Badge tone="wait">Em análise</Badge><Badge tone="warn">Revisar</Badge><Badge tone="muted">Arquivado</Badge><Badge kind="niche">Tecnologia</Badge><Badge kind="network">Site</Badge><Badge kind="sponsored">Patrocinado</Badge><Badge href="/busca">Ver no catálogo</Badge></div> }
