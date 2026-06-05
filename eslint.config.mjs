import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

// Flat config (ESLint 9+). Replaces the old .eslintrc.cjs.
export default tseslint.config(
  { ignores: ['dist/', 'coverage/', '**/*.cjs', 'eslint.config.mjs'] },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  eslintConfigPrettier,
);
