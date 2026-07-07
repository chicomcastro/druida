import { describe, it, expect } from 'vitest';
import { SettlementManager } from '../src/world/SettlementManager.js';
import { makeGame } from './helpers.js';

/**
 * Validador de caminhos (ADR 0155): nenhuma laje de rua pode atravessar a
 * pegada de uma construção habitável em nenhuma vila. Nasceu do playtest, onde
 * o espigão de uma casa externa cruzava a casa interna da mesma fileira — o
 * caminho de saída "passava por dentro" da casa do vizinho.
 */
describe('caminhos das vilas (ADR 0155)', () => {
  it('nenhum caminho atravessa uma casa', () => {
    const sm = new SettlementManager(makeGame());
    const bad = sm.pathsThroughHouses();
    expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
  });

  it('as vilas com ruas registram células de caminho', () => {
    const sm = new SettlementManager(makeGame());
    // Palafitas anda sobre píeres (sem laje de rua); as outras 3 têm ruas.
    expect(Object.keys(sm.pathCells).length).toBeGreaterThanOrEqual(3);
    for (const cells of Object.values(sm.pathCells)) {
      expect(cells.length).toBeGreaterThan(3);
    }
  });
});
