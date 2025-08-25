import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'],
  target: 'node22',
  external: ['vscode'],
  sourcemap: true,
  clean: true,
  outDir: 'out',
  minify: false,
  splitting: false,
  treeshake: true,
  platform: 'node',
  bundle: true,
  skipNodeModulesBundle: true,
  onSuccess: 'echo "Build completed successfully"',
})