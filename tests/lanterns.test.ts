import { describe, it, expect } from 'vitest';
import { SettlementManager } from '../src/world/SettlementManager.js';
import { makeGame } from './helpers.js';

/**
 * Validador de postes (ADR 0128): nenhum poste de lanterna pode ficar sobre a
 * laje de um caminho — eles ladeiam as ruas, nunca caem no meio delas.
 */
describe('postes de iluminação (ADR 0128)', () => {
  it('nenhum poste cai sobre a laje de uma rua', () => {
    const sm = new SettlementManager(makeGame());
    const bad = sm.lanternsOnStreets();
    expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
  });

  it('há postes e ruas registrados nas vilas', () => {
    const sm = new SettlementManager(makeGame());
    expect(sm.lanternPts.length).toBeGreaterThan(10);
    expect(sm.streetCells.size).toBeGreaterThan(20);
  });
});
