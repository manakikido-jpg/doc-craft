import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    rules: {
      // 未使用変数は警告（アンダースコア始まりは許可）
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // any型は警告に留める
      '@typescript-eslint/no-explicit-any': 'warn',
      // useEffect内のsetState — 既存コードに多いため警告に緩和
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])

export default eslintConfig
