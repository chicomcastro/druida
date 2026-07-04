import { describe, it, expect } from 'vitest';
import { BlockGround } from '../src/world/BlockGround.js';
import { BIOMES } from '../src/data/biomes.js';

function stubGame(over: any = {}) {
  return {
    seed: 1337,
    inDungeon: false,
    groupCenter: { x: 0, z: 0 },
    renderer: { add: () => {} },
    worldManager: { _effectiveDef: (b: string) => BIOMES[b] },
    ...over,
  };
}

describe('BlockGround (ADR 0063)', () => {
  it('cria 4 pools (um por textura) e preenche a grade no update', () => {
    const g = new BlockGround(stubGame());
    expect(Object.keys(g._pools)).toEqual(['grass', 'dirt', 'snow', 'stone']);
    g.update();
    // No centro do mundo (clareira), a grade inteira é grama.
    const total = Object.values(g._pools).reduce((s: number, p: any) => s + p.count, 0);
    expect(total).toBe(69 * 69);
    expect((g._pools.grass as any).count).toBe(69 * 69);
  });

  it('divide os blocos por bioma na fronteira e respeita a pureza', () => {
    const g = new BlockGround(stubGame({ groupCenter: { x: 0, z: 55 } })); // borda clareira/pantano
    g.update();
    expect((g._pools.grass as any).count).toBeGreaterThan(0); // pantano também usa grass
    // Nos picos, neve domina.
    const gp = new BlockGround(stubGame({ groupCenter: { x: 0, z: 190 } }));
    gp.update();
    expect((gp._pools.snow as any).count).toBeGreaterThan(1000);
  });

  it('não recompõe sem andar 2+ células e se esconde em masmorra', () => {
    const game = stubGame();
    const g = new BlockGround(game);
    g.update();
    const before = g._lastCx;
    game.groupCenter = { x: 0.9, z: 0.9 }; // menos de 2 células
    g.update();
    expect(g._lastCx).toBe(before);
    game.inDungeon = true;
    g.update();
    expect((g._pools.grass as any).count).toBe(0);
    expect(g._lastCx).toBe(Infinity);
  });
});
