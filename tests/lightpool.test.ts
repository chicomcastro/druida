import { describe, it, expect } from 'vitest';
import { LightPool } from '../src/core/render/LightPool.js';

function stubGame(over: any = {}) {
  return {
    renderer: { add: () => {} },
    groupCenter: { x: 0, z: 0 },
    dayNight: { lightBoost: () => 1 },
    ...over,
  };
}

describe('LightPool (ADR 0065)', () => {
  it('acende só as N mais próximas do grupo', () => {
    const p = new LightPool(stubGame());
    for (let i = 0; i < 20; i++) p.register(i * 10, 1.5, 0, 0xff9a3a, 1.0, 0.5);
    p.update(0.5); // força o repick
    const lit = p.lights.filter((l) => l.intensity > 0);
    expect(lit.length).toBe(6);
    // As acesas são as registradas mais perto da origem (x = 0..50).
    for (const l of lit) expect(l.position.x).toBeLessThanOrEqual(50);
  });

  it('segue o grupo e aplica o boost noturno', () => {
    const game = stubGame({ dayNight: { lightBoost: () => 1.7 } });
    const p = new LightPool(game);
    p.register(0, 1.5, 0, 0xffffff, 1.0, 0); // sem flicker: intensidade estável
    p.update(0.5);
    expect(p.lights[0].intensity).toBeCloseTo(1.7, 5);
    game.groupCenter = { x: 500, z: 0 };
    p.register(500, 1.5, 0, 0xffffff, 1.0, 0);
    p.update(0.5);
    // A luz mais próxima do novo centro é a registrada em x=500.
    expect(p.lights[0].position.x).toBe(500);
  });
});
