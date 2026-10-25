import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Field } from './input'
import { DatePicker } from './date-picker'
import { OverlayDialog } from './overlay-dialog'
import { useState } from 'react'
import { Button } from './button'

const meta = { title: 'Design System/Campos/DatePicker', component: DatePicker, parameters: { layout: 'padded' }, render: args => <div style={{ maxWidth: 360 }}><Field label="Data"><DatePicker {...args} /></Field></div> } satisfies Meta<typeof DatePicker>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = { args: { defaultValue: '2026-10-17', name: 'date' } }
export const Empty: Story = { args: {} }
export const DateAndTime: Story = { args: { withTime: true, defaultValue: '2026-10-17T14:30', required: true } }
export const Disabled: Story = { args: { disabled: true, defaultValue: '2026-10-17' } }
function ModalExample() { const [open, setOpen] = useState(true); return <><Button onClick={() => setOpen(true)}>Abrir formulário</Button><OverlayDialog open={open} title="Prazo do destaque" onClose={() => setOpen(false)}><Field label="Término"><DatePicker defaultValue="2026-10-17T14:30" withTime required /></Field></OverlayDialog></> }
export const InDialog: Story = { render: () => <ModalExample /> }
