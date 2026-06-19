/**
 * Captura visual dos modelos voxel na vitrine (showcase.html). Usado para
 * validar a aparência dos modelos; roda contra o `vite preview`.
 */
describe('Vitrine de modelos', () => {
  it('captura modelos representativos', () => {
    cy.visit('/showcase.html', { timeout: 20000 });
    cy.get('#view', { timeout: 20000 }).should('be.visible');
    cy.get('#t-rotate').click(); // desliga auto-rotação p/ frame estável
    cy.wait(800);
    const kinds = ['druid', 'wolf', 'bear', 'husk', 'shaman', 'rotlord', 'sword'];
    for (const k of kinds) {
      cy.get(`.item[data-kind="${k}"]`).click();
      cy.wait(700);
      cy.screenshot(`model-${k}`, { capture: 'viewport' });
    }
  });
});
