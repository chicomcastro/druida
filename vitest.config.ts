import { defineConfig } from 'vitest/config';

/**
 * Config de testes/cobertura (Vitest). Separada da vite.config.js (build/dev).
 * Cobertura via v8; gera `json-summary`+`json` para o comentário fixo de
 * cobertura no PR (CI). Ver docs/adr/0027-ci-coverage.md e 0031.
 *
 * Escopo da métrica = camada de simulação/lógica (testável em Node). A camada
 * de view/WebGL/DOM/loop e o bootstrap são cobertos pelo e2e (Cypress), não por
 * testes de unidade — por isso ficam fora do `include` (ver ADR 0031).
 */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/main.ts',
        'src/core/Game.ts', // orquestração (constrói WebGL); coberto pelo e2e
        'src/core/GameLoop.ts', // requestAnimationFrame
        'src/core/render/**', // Three.js / WebGL
        'src/core/audio/**', // Web Audio
        'src/core/input/**', // eventos de DOM/Gamepad
        'src/ui/**', // overlays DOM
        'src/systems/render.ts', // sincronização Three.js
        'src/systems/vfx.ts', // efeitos Three.js
        'src/gameplay/storage.ts', // adapter IndexedDB (branches só no browser)
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 60,
      },
    },
  },
});
