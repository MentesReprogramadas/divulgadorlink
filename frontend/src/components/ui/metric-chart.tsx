'use client'

import dynamic from 'next/dynamic'
import type { MetricChartProps } from './metric-chart-renderer'
import styles from './report.module.css'
const Renderer = dynamic(() => import('./metric-chart-renderer').then(module => module.MetricChartRenderer), { ssr: false, loading: () => <div className={styles.chart} role="status" aria-label="Carregando gráfico" aria-busy="true" /> })
export type { MetricChartProps }
export function MetricChart(props: MetricChartProps) { return <Renderer {...props} /> }
