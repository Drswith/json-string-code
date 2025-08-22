// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    ignores: [
      '.github/**',
      // eslint ignore globs here
    ],
  },
  {
    rules: {
      // overrides
      'unused-imports/no-unused-vars': 'off',
    },
  },
)
