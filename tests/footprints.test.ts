import { describe, it, expect } from 'vitest';
import { SettlementManager } from '../src/world/SettlementManager.js';
import { makeGame } from './helpers.js';

/**
 * Validador de layout (ADR 0085): cada estrutura registra sua pegada ao ser
 * construída; este teste falha se QUALQUER par se sobrepuser em qualquer
 * vila — colisões de layout deixam de passar despercebidas.
 */
describe('layout das vilas (ADR 0085)', () => {
  it('nenhuma estrutura sobrepõe outra', () => {
    const sm = new SettlementManager(makeGame());
    const bad = sm.overlaps();
    expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
  });

  it('as 4 vilas registram pegadas de verdade', () => {
    const sm = new SettlementManager(makeGame());
    expect(Object.keys(sm.footprints).length).toBe(4);
    for (const fps of Object.values(sm.footprints)) {
      expect(fps.length).toBeGreaterThan(5);
    }
  });
});
