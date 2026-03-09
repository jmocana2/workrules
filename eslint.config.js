// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
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
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx', '**/*.mjs'],
    plugins: {
      'react-hooks': reactHooks,
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
      'sonarjs/todo-tag': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  },
  {
    files: ['**/*.test.ts', '**/*.test.js'],
    rules: {
      'sonarjs/no-empty-test-file': 'off'
    }
  },
  {
    files: [
      'n8n/nodes/indexer/ref_extract_perfil_claude.js',
      'n8n/nodes/indexer/ref_chunk_markdown.js'
    ],
    rules: {
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/slow-regex': 'off'
    }
  },
  ...storybook.configs['flat/recommended']
];
