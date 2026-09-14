import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

// All service source is TypeScript; original publishing remains outside this scope.
export default [
  { ignores: ['node_modules/**', 'dist/**', 'legacy-preview/**'] },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: ['src/**/*.{ts,tsx}'] })),
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]
