import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./test/setup.ts'],
    alias: {
      vscode: resolve(__dirname, './mocks/vscode.ts'),
    },
  },
})
