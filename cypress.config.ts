import { defineConfig } from 'cypress';

/**
 * Cypress e2e: smoke de runtime + evidências visuais. O jogo é WebGL, então em
 * CI usamos Chrome com SwiftShader (render por software) — senão a cena 3D sai
 * preta. Menus/HUD/mapa são overlay DOM e aparecem de qualquer forma.
 * Ver docs/adr/0028-e2e-cypress.md.
 */
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4173', // vite preview
    supportFile: false,
    video: false,
    defaultCommandTimeout: 10000,
    viewportWidth: 1280,
    viewportHeight: 720,
    setupNodeEvents(on) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium' && browser.name !== 'electron') {
          launchOptions.args.push(
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
            '--ignore-gpu-blocklist',
          );
        }
        return launchOptions;
      });
    },
  },
});
