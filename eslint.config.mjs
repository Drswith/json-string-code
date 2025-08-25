// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    vue: false,
    formatters: true,
    markdown: false,
    ignores: [
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
      'no-template-curly-in-string': 'off',
      'unused-imports/no-unused-vars': 'off',
      'eqeqeq': 'off',
      'no-console': 'off',
      'no-alert': 'off',
      'style/eol-last': 'off',
      'prefer-const': 'off',
    },
  },
)
