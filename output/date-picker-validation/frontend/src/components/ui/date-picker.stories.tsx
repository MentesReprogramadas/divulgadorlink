import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Field } from './input'
import { DatePicker } from './date-picker'

const meta = { title: 'Design System/Campos/DatePicker', component: DatePicker, parameters: { layout: 'padded' }, decorators: [Story => <div style={{ maxWidth: 360 }}><Field label="Data"><Story /></Field></div>] } satisfies Meta<typeof DatePicker>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = { args: { defaultValue: '2026-10-17', name: 'date' } }
export const Empty: Story = { args: {} }
export const DateAndTime: Story = { args: { withTime: true, defaultValue: '2026-10-17T14:30', required: true } }
export const Disabled: Story = { args: { disabled: true, defaultValue: '2026-10-17' } }
