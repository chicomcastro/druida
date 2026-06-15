// Config flat mínima (ESLint 9). Mantém o lint executável no CI sem travar o
// protótipo com regras agressivas; endurecer conforme o código amadurece.
export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
      'no-undef': 'off',
    },
  },
];
