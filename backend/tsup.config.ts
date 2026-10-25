import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server.ts', 'src/worker.ts', 'src/scripts/simulate-scheduled-metrics.ts', 'src/scripts/configure-profile-plans.ts'],
  outDir: 'build',
  format: ['cjs'],
  target: 'es2022',
  clean: true,
  sourcemap: true,
  splitting: false,
})
