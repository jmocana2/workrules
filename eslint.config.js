import tsParser from '@typescript-eslint/parser';
import sonarjs from 'eslint-plugin-sonarjs';

export default [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'build/**',
      'supabase/functions/coverage/**'
    ]
  },
  {
    files: ['**/*.js', '**/*.ts', '**/*.mjs'],
    plugins: {
      sonarjs
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Deno: 'readonly'
      },
      parserOptions: {
        project: null
      }
    },
    rules: {
      ...sonarjs.configs.recommended.rules
    }
  }
];
