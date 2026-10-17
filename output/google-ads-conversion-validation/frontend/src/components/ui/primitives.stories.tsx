import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Button, ButtonLink } from './button'
import { Field, Input, Select, TextArea } from './input'
import { Badge } from './badge'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { Loading } from '@/components/feedback/loading'
import { AdvertiseLanding } from '@/features/acquisition/components/advertise-landing'

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
