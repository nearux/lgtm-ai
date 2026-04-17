import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
  { ignores: ['dist', 'esbuild.config.mjs'] },
  {
    files: ['**/*.ts'],
    ...js.configs.recommended,
  },
  ...tseslint.configs.recommended.map((config) => ({
    files: ['**/*.ts'],
    ...config,
  })),
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
];
