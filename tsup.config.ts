import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'],
  target: 'node16',
  external: [
    'vscode',
  ],
  sourcemap: true,
  clean: true,
  outDir: 'out',
  minify: false,
  splitting: false,
})