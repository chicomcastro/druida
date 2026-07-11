import { describe, it, expect } from 'vitest';
import { makeGame } from './helpers.js';
import { SettlementManager } from '../src/world/SettlementManager.js';
import { interiorTheme, INTERIOR_THEMES } from '../src/data/interiors.js';

/**
 * Vila viva nas demais vilas (E38): Vau, Cinzafolha e Degelo passam a ter LARES
 * entráveis (temas *_home, marcados como residence), cada um um recinto de
 * família — fechando o gap do E36 (só a Clareira tinha moradia por-casa). Cada
 * povo mora onde vive, com a paleta e o formato de interior da sua vila.
 */
describe('Moradia nas vilas 2–4 (E38)', () => {
  it('cada vila (não-hub) ganha recintos de LAR próprios, com famílias', () => {
    const sm = new SettlementManager(makeGame());
    for (const theme of ['palafitas', 'lenhadores', 'degelo']) {
      const homes = (sm._venues[theme] ?? []).filter((v: any) => v.kind === 'home');
      expect(homes.length, `${theme} sem lares`).toBeGreaterThanOrEqual(2);
      // Cada lar é um recinto único (id próprio) e usa o tema-lar da vila.
      const ids = new Set(homes.map((h: any) => h.id));
      expect(ids.size).toBe(homes.length);
      for (const h of homes) expect(interiorTheme(h.themeId).residence).toBe(true);
    }
  });

  it('os temas-lar de cada vila têm paleta/identidade próprias (design distinto)', () => {
    const perVillage = ['vau_home', 'cinza_home', 'degelo_home'];
    for (const id of perVillage) {
      const t = INTERIOR_THEMES[id];
      expect(t).toBeTruthy();
      expect(t.residence).toBe(true);
      expect(t.service).toBe('talk'); // lar não é loja
      expect(t.lines.length).toBeGreaterThan(0);
    }
    // Paletas distintas entre as três moradias (não é o mesmo interior repetido).
    const accents = perVillage.map((id) => INTERIOR_THEMES[id].accent);
    expect(new Set(accents).size).toBe(3);
  });

  it('moradores das vilas 2–4 apontam para a SUA moradia (homeVenueId)', () => {
    const sm = new SettlementManager(makeGame());
    for (const theme of ['palafitas', 'lenhadores', 'degelo']) {
      const residents = sm._villagers.filter((v: any) => v.theme === theme);
      expect(residents.length).toBeGreaterThan(0);
      const homed = residents.filter((v: any) => v.homeVenueId);
      // Todo morador com lar aponta para um venue de LAR existente da vila.
      const homeIds = new Set((sm._venues[theme] ?? []).filter((v: any) => v.kind === 'home').map((v: any) => v.id));
      expect(homed.length).toBeGreaterThan(0);
      for (const v of homed) expect(homeIds.has(v.homeVenueId)).toBe(true);
    }
  });
});
