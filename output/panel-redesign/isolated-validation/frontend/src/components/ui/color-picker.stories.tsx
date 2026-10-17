import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ColorPicker } from './color-picker'
const meta = { title: 'Design System/Personalização/ColorPicker', component: ColorPicker, parameters: { layout: 'padded' } } satisfies Meta<typeof ColorPicker>
export default meta
type Story = StoryObj<typeof meta>
function Example() { const [value, setValue] = useState('#173c32'); return <div style={{ maxWidth: 420 }}><ColorPicker label="Cor do fundo" value={value} onChange={setValue} /></div> }
export const Interactive: Story = { args: { label: 'Cor do fundo', value: '#173c32', onChange: () => {} }, render: () => <Example /> }
