import { defineConfig } from 'vitest/config';

/**
 * Config de testes/cobertura (Vitest). Separada da vite.config.js (build/dev).
 * Cobertura via v8; gera `json-summary`+`json` para o comentário fixo de
 * cobertura no PR (CI). Ver docs/adr/0027-ci-coverage.md.
 */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      // Bootstrap e camadas puramente de render/DOM ficam fora da métrica de
      // lógica (são cobertas pelo e2e do Cypress — PR seguinte).
      exclude: ['src/main.ts', 'src/**/*.d.ts'],
    },
  },
});
