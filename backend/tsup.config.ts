import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server.ts', 'src/worker.ts', 'src/scripts/simulate-scheduled-metrics.ts'],
  outDir: 'build',
  format: ['cjs'],
  target: 'es2022',
  clean: true,
  sourcemap: true,
  splitting: false,
})
