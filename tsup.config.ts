import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'es5',
  clean: true,
  shims: false,
  dts: false,
  external: [
    'vscode',
  ],
})
