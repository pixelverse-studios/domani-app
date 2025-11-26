import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // React 17+ doesn't require React import for JSX
      'react/react-in-jsx-scope': 'off',
      // Allow unused vars prefixed with underscore
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // Prefer const
      'prefer-const': 'warn',
      // No console in production (warn for now)
      'no-console': 'warn',
      // Allow empty functions (useful for default props)
      '@typescript-eslint/no-empty-function': 'off',
      // Allow any in some cases (can tighten later)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Require explicit return types on exported functions
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // React hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Allow require() for React Native compatibility
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  prettier,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'build/**',
      'vendor/**',
      'android/**',
      'ios/**',
      '*.config.js',
      'babel.config.js',
      'metro.config.js',
    ],
  },
)
