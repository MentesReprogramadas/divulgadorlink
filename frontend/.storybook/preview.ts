import type { Preview } from '@storybook/nextjs-vite'
import { createElement } from 'react'
import { Outfit, Source_Sans_3 } from 'next/font/google'
import { OndasAtmosphere } from '../src/components/layout/ondas-atmosphere'
import '../src/app/globals.css'

const sourceSans = Source_Sans_3({ subsets: ['latin'], display: 'swap', variable: '--font-source-sans' })
const outfit = Outfit({ subsets: ['latin'], display: 'swap', variable: '--font-outfit' })

const preview: Preview = {
  decorators: [Story => createElement('div', { lang: 'pt-BR', className: `${sourceSans.variable} ${outfit.variable}`, style: { minHeight: '100vh', isolation: 'isolate' } },
    createElement('style', null, `:root{--font-sans:${JSON.stringify(sourceSans.style.fontFamily)},sans-serif;--font-product:${JSON.stringify(outfit.style.fontFamily)},sans-serif}`),
    createElement(OndasAtmosphere), createElement(Story))],
  parameters: {
    layout: 'padded',
    nextjs: { appDirectory: true },
  },
}

export default preview
