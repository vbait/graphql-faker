import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'docs', 'node_modules'] },
  js.configs.recommended,
  importPlugin.flatConfigs.recommended,
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      // Module resolution is fully validated by `tsc` (npm run check);
      // the import plugin can't follow `.js` specifiers that map to `.ts`.
      'import/no-unresolved': 'off',
    },
  },
  {
    files: ['**/*.ts'],
    extends: [
      importPlugin.flatConfigs.typescript,
      ...tseslint.configs.strictTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/array-type': ['error', { default: 'generic' }],
      '@typescript-eslint/consistent-indexed-object-style': [
        'error',
        'index-signature',
      ],

      // Rules requiring `strictNullChecks`, which this project does not
      // enable; kept off to match the existing (non-strict) type checking.
      '@typescript-eslint/no-useless-default-assignment': 'off',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',

      // FIXME: remove below rules
      'import/no-extraneous-dependencies': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',

      // FIXME: blocked by improper type checking should be fixed
      // after we switch TSC in strict mode
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/dot-notation': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
);
