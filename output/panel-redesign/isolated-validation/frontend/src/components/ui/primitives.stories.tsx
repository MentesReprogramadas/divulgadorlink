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

const meta = { title: 'Design System/Controles', component: Button, parameters: { layout: 'padded' } } satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = { args: { children: 'Salvar alterações', variant: 'primary' } }
export const Secondary: Story = { args: { children: 'Voltar', variant: 'secondary' } }
export const Danger: Story = { args: { children: 'Excluir conta', variant: 'danger' } }
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
