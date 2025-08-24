import { defineConfig } from 'tsup'

export default defineConfig({
  // entry: ['src/extension.ts'],
  entry: ['src/index.ts'],
  outDir: 'out',
  format: ['cjs'],
  target: 'esnext',
  clean: true,
  shims: false,
  dts: false,
  sourcemap: true,
  external: [
    'vscode',
  ],
})
