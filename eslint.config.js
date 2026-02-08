import tsParser from '@typescript-eslint/parser';
import sonarjs from 'eslint-plugin-sonarjs';

export default [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'build/**',
      'supabase/functions/coverage/**',
      '**/*.min.js',
      'pnpm-lock.yaml',
      'package-lock.json'
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
      ...sonarjs.configs.recommended.rules,
      'sonarjs/todo-tag': 'off'
    }
  },
  {
    files: ['**/*.test.ts', '**/*.test.js'],
    rules: {
      'sonarjs/no-empty-test-file': 'off'
    }
  },
  {
    files: ['n8n/nodes/indexer/ref_extract_perfil_claude.js', 'n8n/nodes/indexer/ref_chunk_markdown.js'],
    rules: {
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/slow-regex': 'off'
    }
  }
];
