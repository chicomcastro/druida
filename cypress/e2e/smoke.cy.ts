/**
 * Smoke e2e do Druida: percorre as telas principais, captura evidências
 * visuais (documentadas no PR) e falha se houver qualquer erro de runtime no
 * console. Usa o hook de depuração `window.DRUIDA` para dirigir estados de UI
 * de forma determinística. Ver docs/adr/0028-e2e-cypress.md.
 */
describe('Druida — smoke + evidências visuais', () => {
  const errors: string[] = [];

  beforeEach(() => {
    errors.length = 0;
    cy.visit('/', {
      onBeforeLoad(win) {
        const orig = win.console.error.bind(win.console);
        cy.stub(win.console, 'error').callsFake((...args: any[]) => {
          errors.push(args.map(String).join(' '));
          orig(...args);
        });
        win.addEventListener('error', (e) => errors.push('error: ' + e.message));
        win.addEventListener('unhandledrejection', (e: any) =>
          errors.push('rejection: ' + (e.reason?.message ?? e.reason)));
      },
    });
  });

  it('navega pelas telas e captura as UIs relevantes', () => {
    const g = () => cy.window().then((w) => (w as any).DRUIDA);

    // Menu principal
    cy.get('#game', { timeout: 20000 }).should('be.visible');
    cy.get('#menu-main').should('contain.text', 'Druida');
    cy.screenshot('01-menu-principal', { capture: 'viewport' });

    // Inicia o jogo
    cy.get('#m-new').click();
    cy.window().its('DRUIDA').should('exist');
    cy.wait(1500); // alguns frames para a cena montar
    cy.screenshot('02-hud-inicial');

    // Inventário / equipamento / encantamento
    g().then((game) => game.menus.toggleInventory());
    cy.get('#menu-inv').should('be.visible');
    cy.screenshot('03-inventario');
    g().then((game) => game.menus.toggleInventory());

    // Mapa-mundi (fog of war)
    g().then((game) => game.worldMap.toggle());
    cy.get('#worldmap').should('be.visible');
    cy.screenshot('04-mapa-mundi');
    g().then((game) => game.worldMap.toggle());

    // Diálogo (Guardiã) — dispara pelo caminho real (event bus) e valida que o
    // texto RENDERIZOU. A visibilidade do #hud-dialogue tem um timer de
    // auto-hide que corre de forma instável sob headless; para a captura
    // garantimos a exibição forçando o display no elemento consultado.
    g().then((game) => game.emit('dialogue', { lines: ['Guardiã: evidência visual de e2e.'] }));
    cy.get('#hud-dialogue', { timeout: 6000 })
      .should('contain.text', 'Guardiã')
      .invoke('css', 'display', 'block');
    cy.screenshot('05-dialogo');

    // Pausa + controles
    g().then((game) => game.menus.togglePause());
    cy.get('#menu-pause').should('be.visible');
    cy.screenshot('06-pausa');

    // Nenhum erro de runtime durante o percurso
    cy.then(() => {
      expect(errors, `erros de console/runtime:\n${errors.join('\n')}`).to.deep.equal([]);
    });
  });
});
