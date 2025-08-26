// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    vue: false,
    formatters: true,
    markdown: false,
    ignores: [
      'examples/**/*',
      'src/generated',
      '**/*.test.{js,mjs,ts,mts}',
      'out/**/*',
    ],
  },
  {
    languageOptions: {
      globals: {
        // vscode: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
)
