'use client'

import { useId, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import type { PerformanceReport } from '../performance-contract'
import styles from './performance-report.module.css'

const surfaces: Record<string, string> = { HOME: 'Início', SEARCH: 'Busca', NICHE: 'Categoria', ORGANIC: 'Orgânico', RELATED: 'Relacionados' }
function shortDate(timestamp: number) { return new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }) }
function fullDate(timestamp: number) { return new Date(timestamp).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }

export function PerformanceCharts({ report }: { report: PerformanceReport }) {
  const [metric, setMetric] = useState<'clicks' | 'impressions'>('clicks')
  const label = metric === 'clicks' ? 'Cliques' : 'Impressões'
  const id = useId()
  const daily = report.daily.map(row => ({ timestamp: Date.parse(row.day + 'T00:00:00Z'), value: row.available ? row[metric] : null }))
  const breakdown = report.surfaces.filter(row => row.impressions || row.clicks).map(row => ({ name: surfaces[row.surface] ?? row.surface, value: row[metric] }))
  return <div className={styles.details}>
    <fieldset className={styles.chartControls}><legend>Métrica do gráfico</legend>{(['clicks', 'impressions'] as const).map(value => <Button key={value} variant={metric === value ? 'primary' : 'secondary'} aria-pressed={metric === value} onClick={() => setMetric(value)}>{value === 'clicks' ? 'Cliques' : 'Impressões'}</Button>)}</fieldset>
    <section className={styles.section} aria-labelledby={`${id}-timeline`}><div className={styles.sectionHeading}><h4 id={`${id}-timeline`}>Evolução no período</h4><span className={styles.note}>Fuso: São Paulo</span></div>
      <div className={styles.timeline} role="region" aria-label={`${label} por dia`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 600, height: 320 }}>
          <LineChart data={daily} margin={{ top: 18, right: 18, left: 0, bottom: 10 }} accessibilityLayer title={`${label} ao longo do período selecionado`}>
            <CartesianGrid stroke="var(--border-default)" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={shortDate} minTickGap={35} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} domain={[0, 'auto']} width={45} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip isAnimationActive={false} filterNull={false} labelFormatter={value => fullDate(Number(value))} formatter={value => [typeof value === 'number' ? value.toLocaleString('pt-BR') : 'Indisponível', label]} contentStyle={{ border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--surface-raised)', color: 'var(--text-primary)' }} />
            <Line type="linear" dataKey="value" name={label} stroke="var(--color-link)" strokeWidth={3} dot={{ r: 3, fill: 'var(--surface-raised)', strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
    {report.coverage.status !== 'UNAVAILABLE' && breakdown.length ? <section className={styles.section} aria-labelledby={`${id}-surfaces`}><h4 id={`${id}-surfaces`}>Onde seu link apareceu</h4><div className={styles.surfaceChart} role="region" aria-label={`${label} por superfície`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 600, height: 240 }}><BarChart data={breakdown} layout="vertical" margin={{ top: 8, right: 20, bottom: 0, left: 0 }} accessibilityLayer title={`${label} por superfície`}>
        <CartesianGrid stroke="var(--border-default)" strokeDasharray="4 4" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={85} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip isAnimationActive={false} formatter={value => [typeof value === 'number' ? value.toLocaleString('pt-BR') : value, label]} contentStyle={{ border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--surface-raised)', color: 'var(--text-primary)' }} cursor={{ fill: 'var(--surface-subtle)' }} />
        <Bar dataKey="value" name={label} fill="var(--color-link)" radius={[0, 4, 4, 0]} maxBarSize={28} isAnimationActive={false} />
      </BarChart></ResponsiveContainer>
    </div></section> : null}
  </div>
}
